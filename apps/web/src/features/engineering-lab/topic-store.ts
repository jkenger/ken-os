import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  ASSESSOR_PROMPT_VERSION,
  GRADER_PROMPT_VERSION,
  gradeWithRubric,
  TUTOR_PROMPT_VERSION,
  writeLesson,
  writeTopicQuestion,
} from "@ken-os/agents";
import {
  canProve,
  finalizeLesson,
  type CodeRun,
  type Label,
  type LessonContent,
  type QuestionUse,
  type RubricResult,
  type Topic,
  type TopicProgress,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labLessons, labQuestions, labSourcePackets, labTopicEvents } from "@/lib/schema";
import { activeRun } from "./assessment-store";
import { authoredTopics, exerciseFor, findLab } from "./curriculum";
import { labSolutions } from "./generated/lab-solutions.generated";
import { LabInputError } from "./errors";
import { assertBudget, freshPacket, getProgress, latestPacket, recordEvent, requireTopic } from "./store";

// One topic: Learn, Exercise, Prove. Spec: docs/architecture/engineering-rebuild.md, section 3 (Topic) and section 4.

/** Proof answers need at least this many characters. */
export const PROOF_MIN_LENGTH = 30;

export interface TopicLesson extends LessonContent {
  /** Hand-written lessons are never regenerated. */
  authored: boolean;
  writtenAt: string | null;
}

async function closedBook(userId: string) {
  return Boolean(await activeRun(userId));
}

/** The topic's lesson: the hand-written one, or the newest one the Tutor wrote. Null if none yet. */
export async function getLesson(userId: string, topicId: string): Promise<TopicLesson | null> {
  const authored = authoredTopics[topicId];
  if (authored) return { ...authored.lesson, authored: true, writtenAt: null };
  const [row] = await db()
    .select()
    .from(labLessons)
    .where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId)))
    .orderBy(desc(labLessons.version))
    .limit(1);
  if (!row) return null;
  const { heading, body, mentalModel, block, example, deeper, prove, sources } = row.snapshot;
  return {
    heading,
    body,
    mentalModel,
    block,
    example,
    deeper,
    prove,
    sources,
    authored: false,
    writtenAt: row.createdAt.toISOString(),
  };
}

/** Writes the lesson from trusted sources. Closed during an assessment; uses the day's AI allowance. */
export async function generateLesson(userId: string, topicId: string) {
  const topic = requireTopic(topicId);
  if (authoredTopics[topicId]) throw new LabInputError("This lesson is written by hand", 409);
  if (await closedBook(userId))
    throw new LabInputError("Lessons are closed during the assessment. Finish it first", 409);
  const packet = await freshPacket(userId, topicId);
  await assertBudget(userId);
  const { draft, model } = await writeLesson({ topic, packet: packet.packet });
  return db().transaction(async (tx) => {
    const [last] = await tx
      .select({ version: labLessons.version })
      .from(labLessons)
      .where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId)))
      .orderBy(desc(labLessons.version))
      .limit(1);
    const version = (last?.version ?? 0) + 1;
    const snapshot = finalizeLesson(draft, packet.packet, {
      topicId,
      version,
      sourcePacketId: packet.id,
      promptVersion: TUTOR_PROMPT_VERSION,
      model,
    });
    const id = randomUUID();
    await tx.insert(labLessons).values({ id, userId, topicId, version, sourcePacketId: packet.id, snapshot });
    return { id, version };
  });
}

/** Opening a lesson moves the topic to Learning. Only once a lesson exists, and never during an assessment. */
export async function openLesson(userId: string, topicId: string) {
  requireTopic(topicId);
  if (await closedBook(userId))
    throw new LabInputError("Lessons are closed during the assessment. Finish it first", 409);
  if (!(await getLesson(userId, topicId))) throw new LabInputError("No lesson yet", 409);
  const progress = await getProgress(userId, topicId);
  if (progress.state !== "NOT_STARTED") return progress;
  return (await recordEvent(userId, { topicId, kind: "lesson_opened" })).progress;
}

function exerciseOf(topicId: string, labId: string) {
  const topic = requireTopic(topicId);
  const lab = exerciseFor(topic);
  if (lab.id !== labId) throw new LabInputError("That exercise belongs to another topic", 409);
  return lab;
}

/**
 * Records one run of the topic's exercise, passed only when every test passed. An exercise shared by two topics
 * counts for both.
 */
export async function recordExerciseRun(
  userId: string,
  topicId: string,
  input: { labId: string; code: string; passed: number; failed: number; output: string },
) {
  const lab = exerciseOf(topicId, input.labId);
  if (![input.passed, input.failed].every((count) => Number.isInteger(count) && count >= 0))
    throw new LabInputError("Run the tests again");
  const results: CodeRun = { passed: input.passed, failed: input.failed, output: input.output.slice(0, 20_000) };
  const passed = input.failed === 0 && input.passed > 0;
  let progress: TopicProgress | null = null;
  await db().transaction(async (tx) => {
    for (const id of lab.topics) {
      const saved = await recordEvent(
        userId,
        { topicId: id, kind: "exercise_run", labId: lab.id, passed, code: input.code.slice(0, 50_000), results },
        tx,
      );
      if (id === topicId) progress = saved.progress;
    }
  });
  return { passed, progress: progress! };
}

/** Shows the solution. Allowed any time; the exercise must then pass again before Prove opens. */
export async function openSolution(userId: string, topicId: string, labId: string) {
  const lab = exerciseOf(topicId, labId);
  const solution = labSolutions[lab.id];
  if (!solution) throw new LabInputError("This exercise has no solution to show", 404);
  await db().transaction(async (tx) => {
    for (const id of lab.topics) await recordEvent(userId, { topicId: id, kind: "solution_opened", labId: lab.id }, tx);
  });
  return { solution };
}

export interface PublicQuestion {
  id: string;
  prompt: string;
  code: string | null;
}

async function latestQuestion(userId: string, topicId: string, use: QuestionUse) {
  const [row] = await db()
    .select()
    .from(labQuestions)
    .where(and(eq(labQuestions.userId, userId), eq(labQuestions.topicId, topicId), eq(labQuestions.kind, use)))
    .orderBy(desc(labQuestions.createdAt))
    .limit(1);
  return row ?? null;
}

/** Writes and stores one Assessor question for a topic. The hand-written topic's proof is stored as written. */
export async function writeQuestion(userId: string, topic: Topic, use: QuestionUse, focus?: string) {
  const authored = use === "proof" ? authoredTopics[topic.id]?.proof : undefined;
  let question = authored;
  let model = "hand-written";
  let promptVersion = "authored";
  if (!question) {
    await assertBudget(userId);
    const [packet, earlier] = await Promise.all([
      latestPacket(userId, topic.id),
      db()
        .select({ prompt: labQuestions.prompt })
        .from(labQuestions)
        .where(and(eq(labQuestions.userId, userId), eq(labQuestions.topicId, topic.id)))
        .orderBy(desc(labQuestions.createdAt))
        .limit(8),
    ]);
    const written = await writeTopicQuestion({
      topic,
      packet: packet?.packet ?? null,
      use,
      avoid: earlier.map((row) => row.prompt.slice(0, 160)),
      focus,
    });
    question = written.question;
    model = written.model;
    promptVersion = ASSESSOR_PROMPT_VERSION;
  }
  const id = randomUUID();
  await db().insert(labQuestions).values({
    id,
    userId,
    topicId: topic.id,
    kind: use,
    prompt: question.prompt,
    code: question.code,
    rubric: question.rubric,
    referenceAnswer: question.referenceAnswer,
    promptVersion,
    model,
  });
  return { id, prompt: question.prompt, code: question.code };
}

/** The proof prompt, written once the exercise has passed. Try again reuses it. */
export async function getOrWriteProof(userId: string, topicId: string): Promise<PublicQuestion> {
  const topic = requireTopic(topicId);
  if (!canProve(await getProgress(userId, topicId))) throw new LabInputError("Pass the exercise first", 409);
  const existing = await latestQuestion(userId, topicId, "proof");
  if (existing) return { id: existing.id, prompt: existing.prompt, code: existing.code };
  return writeQuestion(userId, topic, "proof");
}

export interface ProofResult {
  passed: boolean;
  label: Label;
  rubric: RubricResult[];
  feedback: string;
  progress: TopicProgress;
}

/** Grades a proof answer against its rubric. Every line met proves the topic, if the exercise still stands passed. */
export async function submitProof(
  userId: string,
  topicId: string,
  input: { questionId: string; answer: string; selfRating: number },
): Promise<ProofResult> {
  const topic = requireTopic(topicId);
  if (!canProve(await getProgress(userId, topicId))) throw new LabInputError("Pass the exercise first", 409);
  const [question] = await db()
    .select()
    .from(labQuestions)
    .where(
      and(
        eq(labQuestions.id, input.questionId),
        eq(labQuestions.userId, userId),
        eq(labQuestions.topicId, topicId),
        eq(labQuestions.kind, "proof"),
      ),
    )
    .limit(1);
  if (!question) throw new LabInputError("Proof prompt not found. Reload the page", 404);
  const answer = input.answer.trim();
  if (answer.length < PROOF_MIN_LENGTH) throw new LabInputError(`Write at least ${PROOF_MIN_LENGTH} characters`);
  if (answer.length > 6000) throw new LabInputError("Keep the answer under 6000 characters");
  if (!Number.isInteger(input.selfRating) || input.selfRating < 1 || input.selfRating > 5)
    throw new LabInputError("Choose a confidence from 1 to 5");
  const graded = await gradeWithRubric({
    subject: topic.title,
    prompt: question.prompt,
    code: question.code,
    rubric: question.rubric,
    answer,
  });
  const passed = graded.rubric.length > 0 && graded.rubric.every((line) => line.result === "covered");
  const { progress } = await recordEvent(userId, {
    topicId,
    kind: "proof",
    questionId: question.id,
    answer,
    selfRating: input.selfRating,
    passed,
    label: graded.label,
    rubric: graded.rubric,
    feedback: graded.feedback,
    graderVersion: `${GRADER_PROMPT_VERSION} · ${graded.model}`,
  });
  return { passed, label: graded.label, rubric: graded.rubric, feedback: graded.feedback, progress };
}

export interface TopicEvidence {
  id: string;
  kind: string;
  at: string;
  passed: boolean | null;
  label: Label | null;
  results: CodeRun | null;
  prompt: string | null;
  answer: string | null;
  selfRating: number | null;
  rubric: RubricResult[] | null;
  feedback: string | null;
  graderVersion: string | null;
}

export interface TopicView {
  progress: TopicProgress;
  lesson: TopicLesson | null;
  /** When the lesson's sources were last checked. */
  sourcesCheckedAt: string | null;
  /** The open assessment hides the lesson. */
  closedBook: boolean;
  proof: PublicQuestion | null;
  /** The latest proof answer, shown again after a refresh. */
  lastProof: TopicEvidence | null;
  /** Exercise runs, proofs and reviews, newest first, for Evidence & sources. */
  evidence: TopicEvidence[];
}

export async function getTopicView(userId: string, topicId: string): Promise<TopicView> {
  requireTopic(topicId);
  const [progress, lesson, packet, open, proofRow, rows] = await Promise.all([
    getProgress(userId, topicId),
    getLesson(userId, topicId),
    latestPacket(userId, topicId),
    closedBook(userId),
    latestQuestion(userId, topicId, "proof"),
    db()
      .select()
      .from(labTopicEvents)
      .where(
        and(
          eq(labTopicEvents.userId, userId),
          eq(labTopicEvents.topicId, topicId),
          inArray(labTopicEvents.kind, ["exercise_run", "proof", "review"]),
        ),
      )
      .orderBy(desc(labTopicEvents.createdAt))
      .limit(40),
  ]);
  const questionIds = [...new Set(rows.map((row) => row.questionId).filter((id): id is string => Boolean(id)))];
  const prompts = questionIds.length
    ? await db()
        .select({ id: labQuestions.id, prompt: labQuestions.prompt })
        .from(labQuestions)
        .where(inArray(labQuestions.id, questionIds))
    : [];
  const evidence = rows.map((row): TopicEvidence => ({
    id: row.id,
    kind: row.kind,
    at: row.createdAt.toISOString(),
    passed: row.passed,
    label: row.label,
    results: row.results,
    prompt: prompts.find((item) => item.id === row.questionId)?.prompt ?? null,
    answer: row.answer,
    selfRating: row.selfRating,
    rubric: row.rubric,
    feedback: row.feedback,
    graderVersion: row.graderVersion,
  }));
  const authored = authoredTopics[topicId];
  // A lesson's sources were checked when its packet was made; a hand-written one, when it was written.
  const lessonPacket =
    lesson && !lesson.authored
      ? (
          await db()
            .select({ checkedAt: labSourcePackets.generatedAt })
            .from(labSourcePackets)
            .innerJoin(labLessons, eq(labLessons.sourcePacketId, labSourcePackets.id))
            .where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId)))
            .orderBy(desc(labLessons.version))
            .limit(1)
        )[0]
      : null;
  return {
    progress,
    lesson: open ? null : lesson,
    sourcesCheckedAt: authored
      ? authored.checkedOn
      : (lessonPacket?.checkedAt.toISOString() ?? packet?.generatedAt.toISOString() ?? null),
    closedBook: open,
    proof:
      proofRow && (canProve(progress) || progress.state === "PROVEN")
        ? { id: proofRow.id, prompt: proofRow.prompt, code: proofRow.code }
        : null,
    lastProof: evidence.find((item) => item.kind === "proof") ?? null,
    evidence,
  };
}

/** The exercise as the browser may see it: no solution. */
export function exerciseView(topic: Topic) {
  const lab = exerciseFor(topic);
  return { ...lab, hasSolution: Boolean(findLab(lab.id) && labSolutions[lab.id]) };
}
