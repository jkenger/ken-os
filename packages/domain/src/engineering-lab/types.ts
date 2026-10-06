// Shared Engineering Lab shapes. See docs/architecture/engineering-lab-v0.md for why each exists.

export const MODES = ["explain", "predict", "debug", "implement", "review", "design"] as const;
export type Mode = (typeof MODES)[number];

/** The five labels the baseline used. Grades must use exactly these. */
export const LABELS = ["solid", "partial", "rusty", "misconception", "gap"] as const;
export type Label = (typeof LABELS)[number];

export const STATUSES = ["NOT_STARTED", "LEARNING", "PRACTICING", "VALIDATED", "NEEDS_REVISIT"] as const;
export type Status = (typeof STATUSES)[number];

/**
 * baseline: an answer in the in-app baseline assessment. It counts like a placement answer. The retired 2026-10-01
 *   summary also used this kind, with gradedBy "baseline"; those entries are never proof of anything.
 * checkpoint: an answer in a later retake of the assessment. Counts like a placement answer.
 * lesson: practice inside a lesson.
 * lab: an authored lab run in the code box.
 * assessment / review: Assessor questions. Review is a proven topic coming back, including in today's practice.
 * practice: today's practice question on a topic that isn't proven yet. Moves status and records misconceptions, but
 *   never proves anything: practice restores what was proven, it doesn't first-prove it (owner, 2026-10-06).
 * assessment, review, practice and the placement-style kinds ask for a confidence rating.
 * placement: Assessor questions for a topic you may already know, asked before any lesson.
 */
export const ATTEMPT_KINDS = ["baseline", "lesson", "lab", "assessment", "review", "placement", "checkpoint", "practice"] as const;
export type AttemptKind = (typeof ATTEMPT_KINDS)[number];

export interface PredictItem {
  mode: "predict";
  prompt: string;
  code: string;
  /** Console lines the Assessor expects. Checked against a real run before it can count. */
  expectedOutput: string[];
  /** Why it prints that, in a few sentences. Shown only after answering. Items written before tutor-v2 / assessor-v2 have none. */
  explanation?: string;
  /** What the Assessor says before asking, in a line or two (assessment v2). Never a hint. Older items have none. */
  lead?: string;
}

export interface WrittenItem {
  mode: Exclude<Mode, "predict">;
  prompt: string;
  /** Code shown with the question, if any (for example a buggy snippet to diagnose). */
  code: string | null;
  /** Points a solid answer must cover. Shown to the grader, never to the learner before answering. */
  rubric: string[];
  misconceptionsToWatch: string[];
  /** What the Assessor says before asking, in a line or two (assessment v2). Never a hint. Older items have none. */
  lead?: string;
}

export type AssessmentItem = PredictItem | WrittenItem;

/** What the learner's browser may see before answering. */
export type PublicItem =
  | Omit<PredictItem, "expectedOutput" | "explanation">
  | Omit<WrittenItem, "rubric" | "misconceptionsToWatch">;

export function toPublicItem(item: AssessmentItem): PublicItem {
  const lead = item.lead ? { lead: item.lead } : {};
  if (item.mode === "predict") return { mode: item.mode, prompt: item.prompt, code: item.code, ...lead };
  return { mode: item.mode, prompt: item.prompt, code: item.code, ...lead };
}

export interface AttemptResponse {
  text?: string;
  code?: string;
  /** Predicted console lines, one per entry. */
  lines?: string[];
  /** The learner's own reason for a prediction. Saved and shown back, never graded. */
  why?: string;
  /** For predictions: what the code really printed in the learner's browser. */
  actual?: string[];
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
  /** For written answers: how the answer did on each rubric point, in rubric order. */
  rubric?: RubricResult[];
  /**
   * A clarifying question the grader asks when an answer is ambiguous (assessment v2). Asked at most once per question;
   * the reply joins the answer and it is graded again. Never stored on its own.
   */
  clarify?: string;
}

export const RUBRIC_RESULTS = ["covered", "partly", "missed"] as const;
export interface RubricResult {
  point: string;
  result: (typeof RUBRIC_RESULTS)[number];
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
  /** The question set it answered, if any. Groups placement-style answers into one sitting. */
  assessmentId?: string | null;
  createdAt: Date;
}
