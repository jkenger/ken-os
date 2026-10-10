// Shared Engineering shapes.

export const MODES = ["explain", "predict", "debug", "implement", "review", "design"] as const;
export type Mode = (typeof MODES)[number];

/** Grade labels: Solid, Partly there, Rusty, Misconception, Gap. Grades must use exactly these. */
export const LABELS = ["solid", "partial", "rusty", "misconception", "gap"] as const;
export type Label = (typeof LABELS)[number];

export interface PredictItem {
  mode: "predict";
  prompt: string;
  code: string;
  /** Console lines the Assessor expects. Checked against a real run before it can count. */
  expectedOutput: string[];
  /** Why it prints that, in a few sentences. Shown only after answering. Items written before tutor-v2 / assessor-v2 have none. */
  explanation?: string;
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
  | Omit<PredictItem, "expectedOutput" | "explanation">
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
}

export const RUBRIC_RESULTS = ["covered", "partly", "missed"] as const;
export interface RubricResult {
  point: string;
  result: (typeof RUBRIC_RESULTS)[number];
}

/** What a topic question is for: the proof step, or a review in Practice. */
export type QuestionUse = "proof" | "review";

/** A proof prompt or practice question, written by the Assessor from the topic's assessment points. */
export interface TopicQuestion {
  prompt: string;
  code: string | null;
  /** A pass needs every line. Hidden until the answer is graded. */
  rubric: string[];
  /** Shown after answering. */
  referenceAnswer: string;
}
