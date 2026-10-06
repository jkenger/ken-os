import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { countsAsProof, isLegacyBaseline, PLACING_KINDS, type AttemptKind, type AttemptResponse, type CodeRun, type Label, type Mode, type RubricResult } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labAssessmentRuns, labAssessments, labAttempts } from "@/lib/schema";
import { findLab, findTopic } from "./curriculum";
import { chapterDone } from "./run-state";
import { toRecord } from "./store";

// One graded answer as it was recorded, for the Profile's evidence link. Read only: attempts are never edited here.
// Design: docs/architecture/engineering-redesign.md, decision D7.

export type EvidenceRole = "proof" | "placement" | "practice" | "legacy" | "voided";

export interface EvidenceView {
  id: string;
  topicId: string;
  topicTitle: string;
  kind: AttemptKind;
  mode: Mode;
  /** What this answer can do for a topic under the progress rules. */
  role: EvidenceRole;
  at: string;
  /** Null while the answer belongs to an unfinished chapter of an open assessment, so grades can't steer it. */
  result: null | {
    label: Label;
    gradedBy: "code" | "assessor" | "baseline";
    feedback: string;
    misconceptions: string[];
    rubric: RubricResult[] | null;
    run: CodeRun | null;
    solutionSeen: boolean;
  };
  selfRating: number | null;
  question: { prompt: string | null; code: string | null; expectedOutput: string[] | null; rubric: string[] | null; labTitle: string | null };
  response: AttemptResponse;
  source: null | { promptVersion: string; model: string; origin: string; runId: string | null; runKind: string | null };
}

function roleOf(attempt: Parameters<typeof countsAsProof>[0]): EvidenceRole {
  if (isLegacyBaseline(attempt)) return "legacy";
  if (attempt.voided) return "voided";
  if ((PLACING_KINDS as readonly string[]).includes(attempt.kind)) return "placement";
  return countsAsProof(attempt) ? "proof" : "practice";
}

const text = (value: unknown) => typeof value === "string" ? value : null;
const lines = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : null;

export interface EvidenceLink {
  id: string;
  topicId: string;
  topicTitle: string;
  kind: AttemptKind;
  label: Label;
  role: EvidenceRole;
  at: string;
}

/**
 * The latest answers that count for something (proof or placement), newest first. Answers inside an open assessment
 * are left out, like the run's own results, until it finishes.
 */
export async function recentEvidence(userId: string, limit = 6): Promise<EvidenceLink[]> {
  const [rows, open] = await Promise.all([
    db().select().from(labAttempts).where(eq(labAttempts.userId, userId)).orderBy(desc(labAttempts.createdAt)).limit(80),
    db().select({ id: labAssessmentRuns.id }).from(labAssessmentRuns).where(and(eq(labAssessmentRuns.userId, userId), isNull(labAssessmentRuns.completedAt))),
  ]);
  const openSets = open.length
    ? new Set((await db().select({ id: labAssessments.id }).from(labAssessments).where(inArray(labAssessments.runId, open.map((run) => run.id)))).map((row) => row.id))
    : new Set<string>();
  return rows
    .filter((row) => !row.assessmentId || !openSets.has(row.assessmentId))
    .map((row) => ({ row, role: roleOf(toRecord(row)) }))
    .filter(({ role }) => role === "proof" || role === "placement")
    .slice(0, limit)
    .map(({ row, role }) => ({ id: row.id, topicId: row.topicId, topicTitle: findTopic(row.topicId)?.title ?? row.topicId, kind: row.kind, label: row.label, role, at: row.createdAt.toISOString() }));
}

/** The owner's own attempt, or null when it doesn't exist or belongs to someone else. */
export async function getEvidence(userId: string, attemptId: string): Promise<EvidenceView | null> {
  const [row] = await db().select().from(labAttempts).where(and(eq(labAttempts.id, attemptId), eq(labAttempts.userId, userId))).limit(1);
  if (!row) return null;
  const [assessment] = row.assessmentId
    ? await db().select().from(labAssessments).where(and(eq(labAssessments.id, row.assessmentId), eq(labAssessments.userId, userId))).limit(1)
    : [];
  const [run] = assessment?.runId
    ? await db().select().from(labAssessmentRuns).where(and(eq(labAssessmentRuns.id, assessment.runId), eq(labAssessmentRuns.userId, userId))).limit(1)
    : [];

  let withheld = false;
  if (run && !run.completedAt) {
    const chapter = run.plan.chapters.find((item) => item.kind === "topics" && item.topicIds.includes(row.topicId));
    withheld = !chapter || !(await chapterDone(db(), run, chapter));
  }

  const item = row.item;
  const lab = row.labId ? findLab(row.labId) : undefined;
  return {
    id: row.id,
    topicId: row.topicId,
    topicTitle: findTopic(row.topicId)?.title ?? row.topicId,
    kind: row.kind,
    mode: row.mode,
    role: roleOf(toRecord(row)),
    at: row.createdAt.toISOString(),
    result: withheld ? null : {
      label: row.label, gradedBy: row.gradedBy, feedback: row.feedback, misconceptions: row.misconceptions,
      rubric: row.rubric ?? null, run: row.run ?? null, solutionSeen: row.solutionSeen,
    },
    selfRating: row.selfRating,
    question: {
      prompt: text(item.prompt),
      code: text(item.code),
      // The answer key and rubric stay hidden until the answer's result is shown.
      expectedOutput: withheld ? null : lines(item.expectedOutput),
      rubric: withheld ? null : lines(item.rubric),
      labTitle: lab?.title ?? text(item.title),
    },
    response: row.response,
    source: assessment ? { promptVersion: assessment.promptVersion, model: assessment.model, origin: assessment.origin, runId: assessment.runId, runKind: run?.kind ?? null } : null,
  };
}
