import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { GRADER_PROMPT_VERSION, gradeWithRubric } from "@ken-os/agents";
import {
  areaScores,
  combinePredictGrade,
  normalizeLines,
  parsePredictedLines,
  runPosition,
  type AssessmentQuestion,
  type Label,
  type RubricResult,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labRunAnswers, labRuns } from "@/lib/schema";
import { assessment, careers } from "./curriculum";
import { LabInputError } from "./errors";
import { getProfileRow } from "./profile-store";

// The 5-question assessment. Spec: docs/architecture/engineering-rebuild.md, section 3 (Intake, Assessment, Results).
// Every assessment is its own run with the questions copied in, so a taken one never changes. Answers lock on submit;
// the Assessor grades afterwards, and a failed grade leaves the answer saved for a retry.

/** The assessment in progress, if any. While it is open, lessons and term lookup stay closed. */
export async function activeRun(userId: string) {
  const [run] = await db()
    .select()
    .from(labRuns)
    .where(and(eq(labRuns.userId, userId), isNull(labRuns.completedAt)))
    .limit(1);
  return run ?? null;
}

/** Starts an assessment, or returns the one already open. Needs the intake first. */
export async function startRun(userId: string) {
  const open = await activeRun(userId);
  if (open) return { id: open.id };
  const profile = await getProfileRow(userId);
  if (!profile?.intake) throw new LabInputError("Fill in the intake first", 409);
  const id = randomUUID();
  await db().insert(labRuns).values({ id, userId, questions: assessment.questions });
  return { id };
}

async function requireRun(userId: string, runId: string) {
  const [run] = await db()
    .select()
    .from(labRuns)
    .where(and(eq(labRuns.id, runId), eq(labRuns.userId, userId)))
    .limit(1);
  if (!run) throw new LabInputError("Assessment not found. Reload the page", 404);
  return run;
}

async function answersFor(runId: string) {
  return db()
    .select()
    .from(labRunAnswers)
    .where(eq(labRunAnswers.runId, runId))
    .orderBy(asc(labRunAnswers.questionIndex));
}

export interface PublicQuestion {
  index: number;
  area: AssessmentQuestion["area"];
  kind: AssessmentQuestion["kind"];
  prompt: string;
  code: string | null;
}

export interface AnswerView {
  index: number;
  answer: string;
  output: string[] | null;
  selfRating: number;
  /** Null while grading has failed. */
  label: Label | null;
  feedback: string | null;
  rubric: RubricResult[] | null;
  graderVersion: string | null;
  answeredAt: string;
}

export interface RunView {
  id: string;
  startedAt: string;
  completedAt: string | null;
  /** Rubrics and expected output stay on the server until the answer is graded. */
  questions: PublicQuestion[];
  answers: AnswerView[];
  position: ReturnType<typeof runPosition>;
}

function toAnswerView(row: typeof labRunAnswers.$inferSelect): AnswerView {
  return {
    index: row.questionIndex,
    answer: row.answer,
    output: row.output,
    selfRating: row.selfRating,
    label: row.label,
    feedback: row.feedback,
    rubric: row.rubric,
    graderVersion: row.graderVersion,
    answeredAt: row.createdAt.toISOString(),
  };
}

export async function getRunView(userId: string, runId: string): Promise<RunView> {
  const run = await requireRun(userId, runId);
  const answers = await answersFor(run.id);
  return {
    id: run.id,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    questions: run.questions.map((question, index) => ({
      index,
      area: question.area,
      kind: question.kind,
      prompt: question.prompt,
      code: question.code,
    })),
    answers: answers.map(toAnswerView),
    position: runPosition(
      run.questions.length,
      answers.map((row) => ({ questionIndex: row.questionIndex, label: row.label })),
    ),
  };
}

/** Grades a saved answer and stores the grade. Throws when the Assessor fails; the answer stays saved either way. */
async function grade(runId: string, question: AssessmentQuestion, row: typeof labRunAnswers.$inferSelect) {
  const facts = question.expectedOutput ? [`The snippet prints, in order: ${question.expectedOutput.join(", ")}`] : [];
  const subject = careers.areas.find((area) => area.id === question.area)?.title ?? question.area;
  const graded = await gradeWithRubric({
    subject,
    prompt: question.prompt,
    code: question.code,
    rubric: question.kind === "predict" ? question.rubric.slice(1) : question.rubric,
    answer: row.answer,
    facts,
  });
  const result =
    question.kind === "predict"
      ? combinePredictGrade(question, row.output ?? [], graded)
      : { label: graded.label, rubric: graded.rubric, feedback: graded.feedback };
  const [saved] = await db()
    .update(labRunAnswers)
    .set({
      label: result.label,
      rubric: result.rubric,
      feedback: result.feedback,
      graderVersion: `${GRADER_PROMPT_VERSION} · ${graded.model}`,
      gradedAt: new Date(),
    })
    .where(and(eq(labRunAnswers.id, row.id), isNull(labRunAnswers.label)))
    .returning();
  await completeIfDone(runId);
  return saved ?? row;
}

async function completeIfDone(runId: string) {
  const [run] = await db().select().from(labRuns).where(eq(labRuns.id, runId)).limit(1);
  if (!run || run.completedAt) return;
  const graded = await db()
    .select({ id: labRunAnswers.id })
    .from(labRunAnswers)
    .where(and(eq(labRunAnswers.runId, runId), isNotNull(labRunAnswers.label)));
  if (graded.length >= run.questions.length)
    await db()
      .update(labRuns)
      .set({ completedAt: new Date() })
      .where(and(eq(labRuns.id, runId), isNull(labRuns.completedAt)));
}

export interface SubmitInput {
  index: number;
  answer: string;
  /** Predict questions: what prints, one value per line. */
  output?: string;
  selfRating: number;
}

/**
 * Locks the answer, then grades it. Answers go in order, and the previous one must be graded first. When grading
 * fails, the answer is still saved and the result says so.
 */
export async function submitAnswer(
  userId: string,
  runId: string,
  input: SubmitInput,
): Promise<{ answer: AnswerView; graded: boolean }> {
  const run = await requireRun(userId, runId);
  if (run.completedAt) throw new LabInputError("This assessment is finished", 409);
  const question = run.questions[input.index];
  if (!question) throw new LabInputError("Question not found. Reload the page", 404);
  const position = runPosition(
    run.questions.length,
    (await answersFor(run.id)).map((row) => ({ questionIndex: row.questionIndex, label: row.label })),
  );
  if (position.kind !== "question" || position.index !== input.index)
    throw new LabInputError("This question is already answered. Reload the page", 409);
  if (!Number.isInteger(input.selfRating) || input.selfRating < 1 || input.selfRating > 5)
    throw new LabInputError("Choose a confidence from 1 to 5");
  const answer = input.answer.trim();
  if (answer.length < 10) throw new LabInputError("Write at least a sentence");
  if (answer.length > 6000) throw new LabInputError("Keep the answer under 6000 characters");
  const output = question.kind === "predict" ? normalizeLines(parsePredictedLines(input.output ?? "")) : null;
  if (question.kind === "predict" && !output?.length) throw new LabInputError("Write what prints, one line each");

  const id = randomUUID();
  const inserted = await db()
    .insert(labRunAnswers)
    .values({ id, userId, runId: run.id, questionIndex: input.index, answer, output, selfRating: input.selfRating })
    .onConflictDoNothing()
    .returning();
  if (!inserted.length) throw new LabInputError("This question is already answered. Reload the page", 409);
  try {
    return { answer: toAnswerView(await grade(run.id, question, inserted[0])), graded: true };
  } catch (error) {
    console.error("assessment grading failed", error instanceof Error ? error.message : error);
    return { answer: toAnswerView(inserted[0]), graded: false };
  }
}

/** Tries the grade again for an answer whose grading failed. */
export async function retryGrade(
  userId: string,
  runId: string,
  index: number,
): Promise<{ answer: AnswerView; graded: boolean }> {
  const run = await requireRun(userId, runId);
  const question = run.questions[index];
  const [row] = await db()
    .select()
    .from(labRunAnswers)
    .where(and(eq(labRunAnswers.runId, run.id), eq(labRunAnswers.questionIndex, index)))
    .limit(1);
  if (!question || !row) throw new LabInputError("Answer not found. Reload the page", 404);
  if (row.label) {
    await completeIfDone(run.id);
    return { answer: toAnswerView(row), graded: true };
  }
  try {
    return { answer: toAnswerView(await grade(run.id, question, row)), graded: true };
  } catch (error) {
    console.error("assessment grading failed", error instanceof Error ? error.message : error);
    return { answer: toAnswerView(row), graded: false };
  }
}

export interface RunSummary {
  id: string;
  startedAt: string;
  completedAt: string | null;
  answers: number;
  solid: number;
}

/** Every assessment, newest first. The first one is just the first row. */
export async function listRuns(userId: string): Promise<RunSummary[]> {
  const runs = await db().select().from(labRuns).where(eq(labRuns.userId, userId)).orderBy(desc(labRuns.startedAt));
  const answers = runs.length
    ? await db()
        .select({ runId: labRunAnswers.runId, label: labRunAnswers.label })
        .from(labRunAnswers)
        .where(eq(labRunAnswers.userId, userId))
    : [];
  return runs.map((run) => {
    const mine = answers.filter((answer) => answer.runId === run.id);
    return {
      id: run.id,
      startedAt: run.startedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
      answers: mine.length,
      solid: mine.filter((answer) => answer.label === "solid").length,
    };
  });
}

/** Per-area grades from the latest finished assessment, for My path. Empty before the first one. */
export async function latestAreaScores(userId: string) {
  const [run] = await db()
    .select()
    .from(labRuns)
    .where(and(eq(labRuns.userId, userId), isNotNull(labRuns.completedAt)))
    .orderBy(desc(labRuns.completedAt))
    .limit(1);
  if (!run) return {};
  const answers = await answersFor(run.id);
  return areaScores(
    run.questions,
    answers.map((row) => ({ questionIndex: row.questionIndex, label: row.label })),
  );
}

/** A finished run's questions with their rubrics, for Results and the evidence page. */
export async function getRunEvidence(userId: string, runId: string) {
  const run = await requireRun(userId, runId);
  const answers = (await answersFor(run.id)).map(toAnswerView);
  return {
    id: run.id,
    startedAt: run.startedAt.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    items: run.questions.map((question, index) => ({
      index,
      question,
      answer: answers.find((answer) => answer.index === index) ?? null,
    })),
  };
}
