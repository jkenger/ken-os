import { gradePrediction } from "./grading";
import { AREAS, type Area } from "./topics";
import type { Label, RubricResult } from "./types";

// The fixed Engineering assessment: 5 questions, one per area. Spec: docs/architecture/engineering-rebuild.md, section 3.

export const QUESTION_KINDS = ["predict", "explain", "debug", "failure"] as const;
export type QuestionKind = (typeof QUESTION_KINDS)[number];

/** The label shown above each question. */
export const QUESTION_KIND_LABELS: Record<QuestionKind, string> = {
  predict: "Predict the output",
  explain: "Explain a decision",
  debug: "Debug a scenario",
  failure: "Reason about failure",
};

export interface AssessmentQuestion {
  id: string;
  area: Area;
  kind: QuestionKind;
  prompt: string;
  code: string | null;
  /** Predict questions only: the exact console lines, compared before the Assessor reads the reason. */
  expectedOutput: string[] | null;
  /** A pass needs every line. */
  rubric: string[];
}

export interface AssessmentSet {
  status: "draft" | "approved";
  reviewedOn: string | null;
  questions: AssessmentQuestion[];
}

function fail(where: string, message: string): never {
  throw new Error(`assessment.yaml ${where}: ${message}`);
}

function text(value: unknown, where: string): string {
  if (typeof value !== "string" || !value.trim()) fail(where, "expected text");
  return value.trim();
}

/** Validates assessment.yaml: one question per area, in area order, each with a rubric; predict questions carry code and output. */
export function parseAssessment(raw: unknown): AssessmentSet {
  const input = (raw ?? {}) as Record<string, unknown>;
  const status = input.status === "approved" ? "approved" : input.status === "draft" ? "draft" : fail("status", "expected draft or approved");
  const reviewedOn = input.reviewedOn === null || input.reviewedOn === undefined ? null : text(input.reviewedOn, "reviewedOn");
  if (status === "approved" && !reviewedOn) fail("reviewedOn", "an approved set needs its review date");
  if (!Array.isArray(input.questions)) fail("questions", "expected a list");
  const questions = input.questions.map((value, index): AssessmentQuestion => {
    const item = (value ?? {}) as Record<string, unknown>;
    const where = `questions[${index}]`;
    const id = text(item.id, `${where}.id`);
    if (!/^[a-z]+(-[a-z]+)*$/.test(id)) fail(where, "id must be kebab-case");
    if (!AREAS.includes(item.area as Area)) fail(`${where}.area`, `expected one of ${AREAS.join(", ")}`);
    if (!QUESTION_KINDS.includes(item.kind as QuestionKind)) fail(`${where}.kind`, `expected one of ${QUESTION_KINDS.join(", ")}`);
    const kind = item.kind as QuestionKind;
    const code = item.code === undefined || item.code === null ? null : text(item.code, `${where}.code`);
    const expectedOutput = Array.isArray(item.expectedOutput) ? item.expectedOutput.map((line) => String(line)) : null;
    if (kind === "predict" && (!code || !expectedOutput?.length)) fail(where, "a predict question needs code and expectedOutput");
    if (kind !== "predict" && expectedOutput) fail(where, "only predict questions have expectedOutput");
    const rubric = Array.isArray(item.rubric) ? item.rubric.map((line, lineIndex) => text(line, `${where}.rubric[${lineIndex}]`)) : [];
    if (rubric.length < 1 || rubric.length > 4) fail(`${where}.rubric`, "expected 1 to 4 lines");
    return { id, area: item.area as Area, kind, prompt: text(item.prompt, `${where}.prompt`), code, expectedOutput, rubric };
  });
  if (questions.map((question) => question.area).join() !== AREAS.join()) fail("questions", `expected one question per area, in order: ${AREAS.join(", ")}`);
  if (new Set(questions.map((question) => question.id)).size !== questions.length) fail("questions", "duplicate id");
  return { status, reviewedOn, questions };
}

/** How strong a grade is, for ordering My path and picking the weaker of two grades. */
export const LABEL_SCORE: Record<Label, number> = { solid: 4, partial: 3, rusty: 2, misconception: 1, gap: 0 };

export function weakerLabel(a: Label, b: Label): Label {
  return LABEL_SCORE[a] <= LABEL_SCORE[b] ? a : b;
}

/** The answers so far, in question order. A null label means the answer is saved but grading failed. */
export interface RunAnswerState {
  questionIndex: number;
  label: Label | null;
}

/**
 * Where a run stands: the question to show next, or that it's waiting on a grade, or done. An answer must be graded
 * before the next question opens, so a failed grade is retried rather than skipped.
 */
export function runPosition(questionCount: number, answers: RunAnswerState[]): { kind: "question"; index: number } | { kind: "grading"; index: number } | { kind: "done" } {
  const byIndex = new Map(answers.map((answer) => [answer.questionIndex, answer]));
  for (let index = 0; index < questionCount; index += 1) {
    const answer = byIndex.get(index);
    if (!answer) return { kind: "question", index };
    if (!answer.label) return { kind: "grading", index };
  }
  return { kind: "done" };
}

/** Grade per area from a run, lower is weaker. Used to put the weakest area first in My path. */
export function areaScores(questions: AssessmentQuestion[], answers: { questionIndex: number; label: Label | null }[]): Partial<Record<Area, number>> {
  const scores: Partial<Record<Area, number>> = {};
  for (const answer of answers) {
    const question = questions[answer.questionIndex];
    if (question && answer.label) scores[question.area] = LABEL_SCORE[answer.label];
  }
  return scores;
}

/**
 * A predict answer: the printed lines are checked in code first, against the stored output, and decide the first
 * rubric line. The Assessor grades the reason against the rest. The grade is the weaker of the two.
 */
export function combinePredictGrade(
  question: AssessmentQuestion,
  predicted: string[],
  reason: { label: Label; rubric: RubricResult[]; feedback: string },
): { label: Label; rubric: RubricResult[]; feedback: string } {
  const output = gradePrediction(predicted, question.expectedOutput ?? [], null);
  const right = output.label === "solid";
  const rubric: RubricResult[] = [{ point: question.rubric[0], result: right ? "covered" : "missed" }, ...reason.rubric];
  return {
    label: right ? reason.label : weakerLabel(output.label, reason.label),
    rubric,
    feedback: right ? reason.feedback : `${output.feedback} ${reason.feedback}`,
  };
}
