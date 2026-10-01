// Shared Engineering Lab shapes. See docs/architecture/engineering-lab-v0.md for why each exists.

export const MODES = ["explain", "predict", "debug", "implement", "review", "design"] as const;
export type Mode = (typeof MODES)[number];

/** The five labels the baseline used. Grades must use exactly these. */
export const LABELS = ["solid", "partial", "rusty", "misconception", "gap"] as const;
export type Label = (typeof LABELS)[number];

export const STATUSES = ["NOT_STARTED", "LEARNING", "PRACTICING", "VALIDATED", "NEEDS_REVISIT"] as const;
export type Status = (typeof STATUSES)[number];

/**
 * baseline: the 2026-10-01 assessment, never proof of anything new.
 * lesson: practice inside a lesson.
 * lab: an authored lab run in the code box.
 * assessment / review: Assessor questions, the only kinds that ask for a confidence rating.
 */
export const ATTEMPT_KINDS = ["baseline", "lesson", "lab", "assessment", "review"] as const;
export type AttemptKind = (typeof ATTEMPT_KINDS)[number];

export interface PredictItem {
  mode: "predict";
  prompt: string;
  code: string;
  /** Console lines the Assessor expects. Checked against a real run before it can count. */
  expectedOutput: string[];
}

export interface WrittenItem {
  mode: Exclude<Mode, "predict">;
  prompt: string;
  /** Code shown with the question, if any (for example a buggy snippet to diagnose). */
  code: string | null;
  /** Points a solid answer must cover. Shown to the grader, never to the learner before answering. */
  rubric: string[];
  misconceptionsToWatch: string[];
}

export type AssessmentItem = PredictItem | WrittenItem;

/** What the learner's browser may see before answering. */
export type PublicItem =
  | Omit<PredictItem, "expectedOutput">
  | Omit<WrittenItem, "rubric" | "misconceptionsToWatch">;

export function toPublicItem(item: AssessmentItem): PublicItem {
  if (item.mode === "predict") return { mode: item.mode, prompt: item.prompt, code: item.code };
  return { mode: item.mode, prompt: item.prompt, code: item.code };
}

export interface AttemptResponse {
  text?: string;
  code?: string;
  /** Predicted console lines, one per entry. */
  lines?: string[];
}

export interface CodeRun {
  passed: number;
  failed: number;
  output: string;
}

export interface Grade {
  by: "code" | "assessor" | "baseline";
  label: Label;
  misconceptions: string[];
  feedback: string;
  run?: CodeRun;
  /** True when the question itself was wrong (for example the Assessor's expected output disagreed with a real run). Never counts. */
  voided?: boolean;
}

export interface AttemptRecord {
  id: string;
  topicId: string;
  kind: AttemptKind;
  mode: Mode;
  label: Label;
  gradedBy: Grade["by"];
  voided: boolean;
  selfRating: number | null;
  misconceptions: string[];
  /** For lab attempts: whether the solution had been revealed before this run. */
  solutionSeen: boolean;
  createdAt: Date;
}
