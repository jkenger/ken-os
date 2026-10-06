import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { nextScreenQuestion, nextTopicQuestion, stageOne, type ItemAnswer, type Label, type RunChapter, type StageOne } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labAssessmentRuns, labAssessments, labAttempts, labChapterScreens } from "@/lib/schema";
import { LabInputError } from "./errors";

// Where an assessment run stands. Kept apart from store.ts so both the store and the run code can use it.

type Database = ReturnType<typeof db>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Reader = Database | Transaction;

export type RunRow = typeof labAssessmentRuns.$inferSelect;
type AssessmentRow = typeof labAssessments.$inferSelect;

export async function itemAnswers(reader: Reader, assessmentId: string): Promise<ItemAnswer[]> {
  const rows = await reader.select({ itemIndex: labAttempts.itemIndex, label: labAttempts.label, voided: labAttempts.voided })
    .from(labAttempts).where(eq(labAttempts.assessmentId, assessmentId));
  return rows.filter((row) => row.itemIndex !== null).map((row) => ({ itemIndex: row.itemIndex!, label: row.label, voided: row.voided }));
}

/** The question a run asks next for this topic's set, or null when the topic is done. */
export async function nextRunItem(reader: Reader, assessment: Pick<AssessmentRow, "id" | "items">) {
  return nextTopicQuestion(assessment.items.map((item) => item.mode), await itemAnswers(reader, assessment.id));
}

/** Where stage 1 of a two-stage chapter stands, from its answered chapter questions in this run. */
export async function chapterStage(reader: Reader, runId: string, chapterId: string): Promise<StageOne> {
  const rows = await reader.select({ itemIndex: labChapterScreens.itemIndex, label: labChapterScreens.label }).from(labChapterScreens)
    .where(and(eq(labChapterScreens.setId, runId), eq(labChapterScreens.chapterId, chapterId), isNotNull(labChapterScreens.answeredAt)));
  return stageOne(rows.sort((a, b) => a.itemIndex - b.itemIndex).map((row) => row.label as Label));
}

/** A run answer must be the question the run is asking now, in an unfinished run. */
export async function assertRunTurn(assessment: AssessmentRow, itemIndex: number) {
  if (!assessment.runId) return;
  const [run] = await db().select().from(labAssessmentRuns).where(eq(labAssessmentRuns.id, assessment.runId)).limit(1);
  if (!run || run.completedAt) throw new LabInputError("This assessment is already finished.", 409);
  const chapter = run.plan.chapters.find((item) => item.kind === "topics" && item.topicIds.includes(assessment.topicId));
  if (chapter?.kind === "topics" && chapter.screenFirst && (await chapterStage(db(), run.id, chapter.chapterId)) !== "drill") {
    throw new LabInputError("Answer the chapter's first two questions before its topics.", 409);
  }
  const next = await nextRunItem(db(), assessment);
  if (next !== itemIndex) throw new LabInputError("Answer the assessment's questions in the order it asks them.", 409);
}

export async function chapterDone(reader: Reader, run: RunRow, chapter: RunChapter): Promise<boolean> {
  if (chapter.kind === "screen") {
    const rows = await reader.select({ itemIndex: labChapterScreens.itemIndex }).from(labChapterScreens)
      .where(and(eq(labChapterScreens.setId, run.id), eq(labChapterScreens.chapterId, chapter.chapterId), isNotNull(labChapterScreens.answeredAt)));
    return nextScreenQuestion(rows.map((row) => row.itemIndex)) === null;
  }
  if (chapter.screenFirst) {
    const stage = await chapterStage(reader, run.id, chapter.chapterId);
    if (stage === "pending") return false;
    if (stage === "cleared") return true;
  }
  const sets = await reader.select().from(labAssessments).where(eq(labAssessments.runId, run.id));
  for (const topicId of chapter.topicIds) {
    const set = sets.find((item) => item.topicId === topicId);
    if (!set || (await nextRunItem(reader, set)) !== null) return false;
  }
  return true;
}

/** Marks the run finished once every chapter is done. Returns true when this call finished it. */
export async function completeRunIfDone(tx: Transaction, runId: string): Promise<boolean> {
  const [run] = await tx.select().from(labAssessmentRuns).where(and(eq(labAssessmentRuns.id, runId), isNull(labAssessmentRuns.completedAt))).for("update");
  if (!run) return false;
  for (const chapter of run.plan.chapters) if (!(await chapterDone(tx, run, chapter))) return false;
  await tx.update(labAssessmentRuns).set({ completedAt: new Date() }).where(eq(labAssessmentRuns.id, runId));
  return true;
}

/** The baseline run, if it has been finished. Until then the retired 1 Oct summary still stands in. */
export async function completedBaseline(userId: string) {
  const [run] = await db().select().from(labAssessmentRuns)
    .where(and(eq(labAssessmentRuns.userId, userId), eq(labAssessmentRuns.kind, "baseline"), isNotNull(labAssessmentRuns.completedAt))).limit(1);
  return run ?? null;
}

/** The run in progress, if any: the unfinished baseline, or an unfinished checkpoint. */
export async function activeRun(userId: string) {
  const [run] = await db().select().from(labAssessmentRuns)
    .where(and(eq(labAssessmentRuns.userId, userId), isNull(labAssessmentRuns.completedAt))).limit(1);
  return run ?? null;
}

/** True while a run that asks about this topic is unfinished: its lesson stays closed for the whole run. */
export async function topicIsClosedBook(userId: string, topicId: string) {
  const run = await activeRun(userId);
  return Boolean(run?.plan.chapters.some((item) => item.kind === "topics" && item.topicIds.includes(topicId)));
}
