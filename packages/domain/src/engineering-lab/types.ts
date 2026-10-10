// Shared Engineering shapes.

export const MODES = ["explain", "predict", "debug", "implement", "review", "design"] as const;
export type Mode = (typeof MODES)[number];

/** Grade labels: Solid, Partly there, Rusty, Misconception, Gap. Grades must use exactly these. */
export const LABELS = ["solid", "partial", "rusty", "misconception", "gap"] as const;
export type Label = (typeof LABELS)[number];

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
