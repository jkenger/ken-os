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
  /** Each test as it ran, so Claude can read a failing test's expected and actual output. Older runs have none. */
  tests?: TestOutcome[];
}

export interface TestOutcome {
  name: string;
  passed: boolean;
  /** For a failing test: what went wrong, usually "Expected …, got …". */
  error?: string;
}

/** How an answer did on one rubric point. Older topic events carry these. */
export interface RubricResult {
  point: string;
  result: "covered" | "partly" | "missed";
}
