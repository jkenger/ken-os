import type { Runner } from "./labs";
import type { Topic } from "./topics";
import type { TestOutcome } from "./types";

// Exercise versions and Claude-written content. Spec: docs/architecture/engineering-claude-connector.md, sections 2 and 4.
// The repo lab is version 0. Claude's exercises are versions 1 and up, checked in the owner's browser before they show,
// and frozen by the first run.

/** Runners Claude may write for. Probes are built into Loots and the sandbox runner isn't available. */
export const CLAUDE_RUNNERS = ["browser", "pglite"] as const satisfies readonly Runner[];
export type ClaudeRunner = (typeof CLAUDE_RUNNERS)[number];

export const EXERCISE_CHECKS = ["unchecked", "valid", "invalid"] as const;
export type ExerciseCheck = (typeof EXERCISE_CHECKS)[number];

/** Size caps for what Claude saves. */
export const CLAUDE_LIMITS = {
  /** A whole lesson, every part counted. */
  lesson: 20_000,
  /** Each exercise file: starter, tests, solution and setup. */
  exerciseFile: 20_000,
  proofPrompt: 1_000,
} as const;

/** One version of a topic's exercise, as Loots keeps it. Only the page that checks it and Show solution see `solution`. */
export interface ExerciseVersion {
  /** The repo lab's id for version 0, the stored row's id for Claude's. Runs and drafts record it as their lab id. */
  id: string;
  version: number;
  source: "repo" | "claude";
  checked: ExerciseCheck;
  /** Why the check failed, for an invalid version. */
  checkProblem: string | null;
  /** Set by the first run. A locked version never changes and stays the owner's until they switch. */
  lockedAt: string | null;
  createdAt: string | null;
}

export interface ExerciseChoice<T extends ExerciseVersion> {
  /** The version the owner works on. */
  current: T;
  /** A valid version newer than the current one, offered with Switch. */
  newer: T | null;
  /** The newest version that failed its check, if nothing valid came after it. */
  invalid: T | null;
  /** The newest version still waiting for its check in the browser, if it is newer than the current one. */
  unchecked: T | null;
}

/**
 * Picks the version the owner is on.
 *
 * - The version they last ran or switched to stays theirs, so tests can't change mid-attempt.
 * - With neither, the newest valid version is the default, else the repo lab.
 * - Unchecked and invalid versions are never current.
 */
export function chooseExercise<T extends ExerciseVersion>(
  versions: readonly T[],
  selectedId: string | null,
): ExerciseChoice<T> {
  const ordered = [...versions].sort((a, b) => a.version - b.version);
  const usable = ordered.filter((item) => item.source === "repo" || item.checked === "valid");
  if (!usable.length) throw new Error("A topic needs at least one usable exercise version.");
  const selected = selectedId ? usable.find((item) => item.id === selectedId) : undefined;
  const current = selected ?? usable[usable.length - 1];
  const after = ordered.filter((item) => item.version > current.version).reverse();
  const newer = after.find((item) => item.checked === "valid") ?? null;
  const sinceNewer = after.filter((item) => item.version > (newer?.version ?? current.version));
  return {
    current,
    newer,
    invalid: sinceNewer.find((item) => item.checked === "invalid") ?? null,
    unchecked: after.find((item) => item.checked === "unchecked") ?? null,
  };
}

/** The browser's two check runs: the solution and the starter, each against the version's tests. */
export interface ExerciseCheckRuns {
  solution: { results: TestOutcome[] } | { error: string };
  starter: { results: TestOutcome[] } | { error: string };
}

/** A version is valid when its solution passes every test and its starter fails at least one, like the repo labs. */
export function judgeExerciseCheck(runs: ExerciseCheckRuns): {
  checked: Exclude<ExerciseCheck, "unchecked">;
  problem: string | null;
} {
  if ("error" in runs.solution)
    return { checked: "invalid", problem: `The solution didn't run: ${runs.solution.error}` };
  const solution = runs.solution.results;
  if (!solution.length) return { checked: "invalid", problem: "No tests ran" };
  const failing = solution.filter((item) => !item.passed);
  if (failing.length) {
    return {
      checked: "invalid",
      problem: `The solution fails ${failing.map((item) => `"${item.name}"${item.error ? ` (${item.error})` : ""}`).join(", ")}`,
    };
  }
  // A starter that throws counts as failing, which is what a starter should do.
  if ("error" in runs.starter) return { checked: "valid", problem: null };
  if (runs.starter.results.every((item) => item.passed))
    return { checked: "invalid", problem: "The starter already passes every test" };
  return { checked: "valid", problem: null };
}

/** Assessment points as Claude names them: p1, p2, … in the order points.yaml lists them. */
export function topicPoints(topic: Pick<Topic, "points">) {
  return topic.points.map((text, index) => ({ id: `p${index + 1}`, text }));
}

/** The point texts a Claude proof question tests. Throws if it names none, or a point that isn't on the topic. */
export function pointsFor(topic: Pick<Topic, "id" | "points">, pointIds: readonly string[]): string[] {
  const points = topicPoints(topic);
  const ids = [...new Set(pointIds)];
  if (!ids.length) throw new Error("Name at least one assessment point the question tests");
  const unknown = ids.filter((id) => !points.some((point) => point.id === id));
  if (unknown.length)
    throw new Error(
      `Not a point on ${topic.id}: ${unknown.join(", ")}. Use ${points.map((point) => point.id).join(", ")}`,
    );
  return points.filter((point) => ids.includes(point.id)).map((point) => point.text);
}
