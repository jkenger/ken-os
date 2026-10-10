import { and, eq, inArray } from "drizzle-orm";
import { GRADER_PROMPT_VERSION, gradeWithRubric } from "@ken-os/agents";
import { pickPractice, PRACTICE_SIZE, type DailyItem, type Label, type RubricResult } from "@ken-os/domain";
import { db } from "@/lib/db";
import { ownerDay } from "@/lib/day";
import { labDailySets, labQuestions, labTopicEvents } from "@/lib/schema";
import { findTopic } from "./curriculum";
import { LabInputError } from "./errors";
import { recheckTopics } from "./radar-store";
import { assertBudget, getAllProgress, getProgress, recordEvent, requireTopic } from "./store";
import { writeQuestion } from "./topic-store";

// Practice: a stable daily set of 4 short reviews. Spec: docs/architecture/engineering-rebuild.md, section 3 (Practice).
// Graded against the topic's points; the grade sets the next review date. No streaks, points or penalties, and a bad
// review never takes Proven away.

export interface PracticeItem {
  topicId: string;
  topicTitle: string;
  reason: DailyItem["reason"];
  questionId: string;
  prompt: string;
  code: string | null;
  answered: null | {
    answer: string;
    selfRating: number;
    label: Label;
    rubric: RubricResult[];
    feedback: string;
    referenceAnswer: string;
    nextReviewAt: string | null;
  };
}

export interface PracticeView {
  day: string;
  items: PracticeItem[];
  done: boolean;
}

/** The topics today's set would hold, without writing anything. */
export async function practiceCandidates(userId: string) {
  const [progress, changed] = await Promise.all([getAllProgress(userId), recheckTopics(userId)]);
  return pickPractice(progress, changed, new Date());
}

async function viewOf(userId: string, day: string, items: DailyItem[]): Promise<PracticeView> {
  const ids = items.map((item) => item.questionId);
  const [questions, answers] = ids.length ? await Promise.all([
    db().select().from(labQuestions).where(and(eq(labQuestions.userId, userId), inArray(labQuestions.id, ids))),
    db().select().from(labTopicEvents).where(and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.kind, "review"), inArray(labTopicEvents.questionId, ids))),
  ]) : [[], []];
  const progress = await getAllProgress(userId);
  const view = items.map((item): PracticeItem => {
    const question = questions.find((row) => row.id === item.questionId)!;
    const answer = answers.find((row) => row.questionId === item.questionId);
    return {
      topicId: item.topicId,
      topicTitle: findTopic(item.topicId)?.title ?? item.topicId,
      reason: item.reason,
      questionId: item.questionId,
      prompt: question.prompt,
      code: question.code,
      answered: answer ? {
        answer: answer.answer ?? "", selfRating: answer.selfRating ?? 0, label: answer.label!, rubric: answer.rubric ?? [], feedback: answer.feedback ?? "",
        referenceAnswer: question.referenceAnswer, nextReviewAt: progress.find((entry) => entry.topicId === item.topicId)?.nextReviewAt ?? null,
      } : null,
    };
  });
  return { day, items: view, done: view.length > 0 && view.every((item) => item.answered) };
}

/** Today's set, or null if it hasn't been made yet. */
export async function getPractice(userId: string): Promise<PracticeView | null> {
  const day = ownerDay();
  const [row] = await db().select().from(labDailySets).where(and(eq(labDailySets.userId, userId), eq(labDailySets.day, day))).limit(1);
  return row ? viewOf(userId, day, row.items) : null;
}

/** Makes today's set: picks up to 4 topics and writes one question each. Stays the same for the rest of the day. */
export async function startPractice(userId: string): Promise<PracticeView> {
  const existing = await getPractice(userId);
  if (existing) return existing;
  const picks = await practiceCandidates(userId);
  if (!picks.length) throw new LabInputError("Nothing to practice yet. Start a topic first", 409);
  await assertBudget(userId, picks.length);
  const items: DailyItem[] = [];
  for (const pick of picks) {
    const topic = requireTopic(pick.topicId);
    const progress = await getProgress(userId, topic.id);
    const focus = pick.reason === "misconception" ? `The last answer on ${topic.title} showed a misconception (graded ${progress.lastLabel}).` : undefined;
    const question = await writeQuestion(userId, topic, "review", focus);
    items.push({ ...pick, questionId: question.id });
  }
  const day = ownerDay();
  await db().insert(labDailySets).values({ userId, day, items, warmUp: !items.some((item) => item.reason === "due" || item.reason === "changed") }).onConflictDoNothing();
  return (await getPractice(userId))!;
}

/** Grades one practice answer against its rubric and sets the topic's next review date from the grade. */
export async function answerPractice(userId: string, input: { questionId: string; answer: string; selfRating: number }) {
  const practice = await getPractice(userId);
  const item = practice?.items.find((entry) => entry.questionId === input.questionId);
  if (!item) throw new LabInputError("Question not in today's practice. Reload the page", 404);
  if (item.answered) throw new LabInputError("Already answered", 409);
  const answer = input.answer.trim();
  if (answer.length < 10) throw new LabInputError("Write at least a sentence");
  if (answer.length > 6000) throw new LabInputError("Keep the answer under 6000 characters");
  if (!Number.isInteger(input.selfRating) || input.selfRating < 1 || input.selfRating > 5) throw new LabInputError("Choose a confidence from 1 to 5");
  const [question] = await db().select().from(labQuestions).where(eq(labQuestions.id, item.questionId)).limit(1);
  const graded = await gradeWithRubric({ subject: item.topicTitle, prompt: question.prompt, code: question.code, rubric: question.rubric, answer });
  try {
    await recordEvent(userId, {
      topicId: item.topicId, kind: "review", questionId: question.id, answer, selfRating: input.selfRating, label: graded.label,
      passed: graded.rubric.every((line) => line.result === "covered"), rubric: graded.rubric, feedback: graded.feedback,
      graderVersion: `${GRADER_PROMPT_VERSION} · ${graded.model}`,
    });
  } catch (error) {
    // The unique index turns a double submit into a clear message instead of a second review.
    if (error instanceof Error && /lab_topic_events_review_unique/.test(error.message + String((error as { cause?: unknown }).cause ?? ""))) throw new LabInputError("Already answered", 409);
    throw error;
  }
  return (await getPractice(userId))!;
}

export const PRACTICE_MINUTES = PRACTICE_SIZE * 3;
