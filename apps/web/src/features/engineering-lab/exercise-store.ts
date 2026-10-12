import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import {
  chooseExercise, CLAUDE_LIMITS, judgeExerciseCheck,
  type ClaudeRunner, type ExerciseCheckRuns, type ExerciseVersion, type LabDefinition, type Topic,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labExerciseDrafts, labExercises, labTopicEvents } from "@/lib/schema";
import { exerciseFor } from "./curriculum";
import { LabInputError } from "./errors";
import { labSolutions } from "./generated/lab-solutions.generated";
import { recordEvent, requireTopic, type Transaction } from "./store";

// Exercise versions, their browser check, locking and autosave. Spec: docs/architecture/engineering-claude-connector.md,
// sections 4 and 5. The repo lab is version 0; Claude's versions are rows in lab_exercises.

/** Run limits for Claude's exercises, matching the slowest repo labs of each runner. */
const TIMEOUT_MS: Record<ClaudeRunner, number> = { browser: 3_000, pglite: 20_000 };

/** One version with everything Ken OS knows about it. `solution` never leaves the server except for the check and Show solution. */
export interface StoredVersion extends ExerciseVersion {
  lab: LabDefinition;
  solution: string | null;
}

/** The exercise as the browser may see it: no solution. */
export interface ExerciseView extends LabDefinition {
  version: number;
  source: "repo" | "claude";
  hasSolution: boolean;
}

export interface ExercisePanel {
  exercise: ExerciseView;
  /** A valid newer version from Claude, offered with Switch. */
  newer: { id: string; version: number } | null;
  /** A newer version that failed its check. The current one stays in use. */
  invalid: { version: number; problem: string } | null;
  /** A version the page must check before it can show: run the solution and the starter against the tests. */
  check: { id: string; version: number; runner: ClaudeRunner; starter: string; tests: string; solution: string; setup: string; timeoutMs: number } | null;
  /** The owner's autosaved code for the current version. */
  draft: { code: string; updatedAt: string } | null;
}

function repoVersion(topic: Topic): StoredVersion {
  const lab = exerciseFor(topic);
  return { id: lab.id, version: 0, source: "repo", checked: "valid", checkProblem: null, lockedAt: null, createdAt: null, lab, solution: labSolutions[lab.id] ?? null };
}

function claudeVersion(topic: Topic, row: typeof labExercises.$inferSelect): StoredVersion {
  return {
    id: row.id, version: row.version, source: "claude", checked: row.checked, checkProblem: row.checkProblem,
    lockedAt: row.lockedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString(), solution: row.solution,
    lab: {
      id: row.id, title: topic.title, topics: [topic.id], modes: ["implement"], runner: row.runner, timeoutMs: TIMEOUT_MS[row.runner],
      hint: row.hint, readme: row.task, starter: row.starter, tests: row.tests, setup: row.setup, probe: null,
    },
  };
}

/** Every version of a topic's exercise, oldest first. */
export async function exerciseVersions(userId: string, topic: Topic): Promise<StoredVersion[]> {
  const rows = await db().select().from(labExercises).where(and(eq(labExercises.userId, userId), eq(labExercises.topicId, topic.id))).orderBy(labExercises.version);
  return [repoVersion(topic), ...rows.map((row) => claudeVersion(topic, row))];
}

/** The version the owner last ran or switched to on this topic, if any. */
async function selectedId(userId: string, topicId: string) {
  const [row] = await db().select({ labId: labTopicEvents.labId }).from(labTopicEvents)
    .where(and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.topicId, topicId), inArray(labTopicEvents.kind, ["exercise_run", "exercise_switched"]), isNotNull(labTopicEvents.labId)))
    .orderBy(desc(labTopicEvents.createdAt)).limit(1);
  return row?.labId ?? null;
}

/** Which version the owner is on, plus any newer, invalid or still-unchecked one. */
export async function exerciseChoice(userId: string, topic: Topic) {
  const [versions, selected] = await Promise.all([exerciseVersions(userId, topic), selectedId(userId, topic.id)]);
  return chooseExercise(versions, selected);
}

export function publicExercise(version: StoredVersion): ExerciseView {
  return { ...version.lab, version: version.version, source: version.source, hasSolution: Boolean(version.solution) };
}

export async function getDraft(userId: string, labId: string) {
  const [row] = await db().select().from(labExerciseDrafts).where(and(eq(labExerciseDrafts.userId, userId), eq(labExerciseDrafts.labId, labId))).limit(1);
  return row ? { code: row.code, updatedAt: row.updatedAt.toISOString() } : null;
}

export async function getExercisePanel(userId: string, topic: Topic): Promise<ExercisePanel> {
  const choice = await exerciseChoice(userId, topic);
  const { current, unchecked } = choice;
  return {
    exercise: publicExercise(current),
    newer: choice.newer ? { id: choice.newer.id, version: choice.newer.version } : null,
    invalid: choice.invalid ? { version: choice.invalid.version, problem: choice.invalid.checkProblem ?? "It failed its check" } : null,
    check: unchecked ? {
      id: unchecked.id, version: unchecked.version, runner: unchecked.lab.runner as ClaudeRunner, starter: unchecked.lab.starter, tests: unchecked.lab.tests,
      solution: unchecked.solution ?? "", setup: unchecked.lab.setup, timeoutMs: unchecked.lab.timeoutMs,
    } : null,
    draft: await getDraft(userId, current.id),
  };
}

/** A version of this topic's exercise the owner may run: the repo lab, or one of Claude's that checked out. */
export async function usableVersion(userId: string, topicId: string, labId: string): Promise<StoredVersion> {
  const version = (await exerciseVersions(userId, requireTopic(topicId))).find((item) => item.id === labId);
  if (!version) throw new LabInputError("That exercise belongs to another topic", 409);
  if (version.source === "claude" && version.checked !== "valid") throw new LabInputError("This exercise doesn't check out", 409);
  return version;
}

/** The first run freezes a Claude version: later changes become new versions, and its runs stay with it. */
export async function lockVersion(tx: Transaction, userId: string, version: StoredVersion) {
  if (version.source !== "claude" || version.lockedAt) return;
  await tx.update(labExercises).set({ lockedAt: new Date() }).where(and(eq(labExercises.id, version.id), eq(labExercises.userId, userId), isNull(labExercises.lockedAt)));
}

/** Autosave: the latest code for one version, one row per version. */
export async function saveDraft(userId: string, topicId: string, input: { labId: string; code: string }) {
  if (input.code.length > CLAUDE_LIMITS.exerciseFile * 2) throw new LabInputError("The code is too long to save");
  await usableVersion(userId, topicId, input.labId);
  const updatedAt = new Date();
  await db().insert(labExerciseDrafts).values({ userId, labId: input.labId, code: input.code, updatedAt })
    .onConflictDoUpdate({ target: [labExerciseDrafts.userId, labExerciseDrafts.labId], set: { code: input.code, updatedAt } });
  return { updatedAt: updatedAt.toISOString() };
}

/** Stores the browser's check of an unchecked version. A version is checked once; later reports change nothing. */
export async function recordCheck(userId: string, topicId: string, exerciseId: string, runs: ExerciseCheckRuns) {
  requireTopic(topicId);
  const verdict = judgeExerciseCheck(runs);
  const updated = await db().update(labExercises).set({ checked: verdict.checked, checkProblem: verdict.problem?.slice(0, 1_000) ?? null, checkedAt: new Date() })
    .where(and(eq(labExercises.id, exerciseId), eq(labExercises.userId, userId), eq(labExercises.topicId, topicId), eq(labExercises.checked, "unchecked")))
    .returning({ checked: labExercises.checked, checkProblem: labExercises.checkProblem });
  if (!updated.length) throw new LabInputError("This exercise was already checked. Reload the page", 409);
  return updated[0];
}

/** Moves the owner to a newer valid version. A fresh attempt: Prove closes until the new version passes. */
export async function switchExercise(userId: string, topicId: string, exerciseId: string) {
  const topic = requireTopic(topicId);
  const choice = await exerciseChoice(userId, topic);
  const target = (await exerciseVersions(userId, topic)).find((item) => item.id === exerciseId);
  if (!target || target.checked !== "valid" || target.version <= choice.current.version) throw new LabInputError("No newer exercise to switch to. Reload the page", 409);
  return (await recordEvent(userId, { topicId, kind: "exercise_switched", labId: target.id })).progress;
}

export interface ClaudeExerciseInput {
  runner: ClaudeRunner;
  task: string;
  starter: string;
  tests: string;
  solution: string;
  hint: string | null;
  setup: string;
}

/** Saves Claude's exercise as the topic's next version, unchecked until the owner's browser checks it. */
export async function saveClaudeExercise(userId: string, topicId: string, input: ClaudeExerciseInput) {
  requireTopic(topicId);
  return db().transaction(async (tx) => {
    const [last] = await tx.select({ version: labExercises.version }).from(labExercises)
      .where(and(eq(labExercises.userId, userId), eq(labExercises.topicId, topicId))).orderBy(desc(labExercises.version)).limit(1);
    const version = (last?.version ?? 0) + 1;
    const id = randomUUID();
    await tx.insert(labExercises).values({ id, userId, topicId, version, source: "claude", ...input });
    await recordEvent(userId, { topicId, kind: "exercise_saved", labId: id, source: "claude" }, tx);
    return { id, version, checked: "unchecked" as const };
  });
}
