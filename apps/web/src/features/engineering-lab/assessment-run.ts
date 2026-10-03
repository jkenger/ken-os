import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { ASSESSOR_PROMPT_VERSION, gradeAnswer, SCREENER_PROMPT_VERSION, writeChapterAssessment, writeChapterScreen } from "@ken-os/agents";
import {
  nextScreenQuestion, planRun, SCREEN_QUESTIONS, toPublicItem,
  type AddedChapter, type IntakeAnswers, type Label, type PublicItem, type RubricResult, type RunChapter, type RunKind,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labAssessmentRuns, labAssessments, labAttempts, labChapterScreens, labLessons, labProfile } from "@/lib/schema";
import { findChapter, findTopic, runModes, topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { activeRun, chapterDone, completedBaseline, completeRunIfDone, nextRunItem, type RunRow } from "./run-state";
import { assertBudget, getAllProgress } from "./store";

// The baseline assessment and its retakes. Design: docs/architecture/engineering-lab-profile.md, section 4.

/** AI calls a run may make: one per chapter, plus room for retries. Separate from the daily limit. */
export function runAllowance(run: Pick<RunRow, "plan">) {
  return run.plan.chapters.length + 6;
}

function fingerprint(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim().slice(0, 100);
}

function intakeHint(intake: IntakeAnswers | null | undefined) {
  if (!intake) return undefined;
  return `Builds: ${intake.building}. Uses: ${intake.stack}. AI work so far: ${intake.aiWork}.`.slice(0, 600);
}

async function profileOf(userId: string) {
  const [row] = await db().select().from(labProfile).where(eq(labProfile.userId, userId)).limit(1);
  return row ?? null;
}

/** A chapter by id: a course chapter, or one you added through the Guide. */
export function chapterInfo(chapterId: string, added: AddedChapter[] = []) {
  const course = findChapter(chapterId);
  if (course) return { id: course.id, title: course.title, area: course.area, planned: course.planned };
  const own = added.find((chapter) => chapter.id === chapterId);
  return own ? { id: own.id, title: own.title, area: own.area, planned: [] as string[] } : null;
}

async function ownedRun(userId: string, runId: string) {
  const [run] = await db().select().from(labAssessmentRuns).where(and(eq(labAssessmentRuns.id, runId), eq(labAssessmentRuns.userId, userId))).limit(1);
  if (!run) throw new LabInputError("Assessment not found. Reload the page", 404);
  return run;
}

/**
 * Starts the baseline, or a checkpoint once the baseline is finished. Starting again while one is unfinished just
 * returns it, so the run can be resumed over several days.
 */
export async function startRun(userId: string, kind: RunKind) {
  const open = await activeRun(userId);
  if (open) {
    if (open.kind !== kind) throw new LabInputError(`Finish the ${open.kind} you started first.`, 409);
    return { id: open.id, resumed: true };
  }
  const baselineRun = await completedBaseline(userId);
  if (kind === "baseline" && baselineRun) throw new LabInputError("Your baseline is already taken. It never changes; take a checkpoint instead.", 409);
  if (kind === "checkpoint" && !baselineRun) throw new LabInputError("Take the baseline before a checkpoint.", 409);
  const progress = await getAllProgress(userId);
  const plan = planRun(topicMap, progress);
  // A topic proven only by labs has nothing the Assessor may ask; it isn't skipped as known, just not asked.
  plan.chapters = plan.chapters.map((chapter): RunChapter => chapter.kind === "topics"
    ? { ...chapter, topicIds: chapter.topicIds.filter((id) => runModes(findTopic(id)!).length > 0) }
    : chapter);
  const id = randomUUID();
  try {
    await db().insert(labAssessmentRuns).values({ id, userId, kind, plan });
  } catch (error) {
    // Two starts at once: the unique baseline index lets only one through.
    const again = await activeRun(userId);
    if (again) return { id: again.id, resumed: true };
    throw error;
  }
  return { id, resumed: false };
}

/** Writes one chapter's questions in a single AI call. Calling it again only fills in what's missing. */
export async function prepareChapter(userId: string, runId: string, chapterId: string) {
  const run = await ownedRun(userId, runId);
  if (run.completedAt) throw new LabInputError("This assessment is already finished.", 409);
  const chapter = run.plan.chapters.find((item) => item.chapterId === chapterId);
  if (!chapter) throw new LabInputError("That chapter isn't part of this assessment.", 404);
  if (run.generations >= runAllowance(run)) throw new LabInputError("This assessment has used its AI allowance. Ask for more before continuing.", 429);
  const profile = await profileOf(userId);
  const hint = intakeHint(profile?.intake);

  if (chapter.kind === "screen") {
    const existing = await db().select({ id: labChapterScreens.id }).from(labChapterScreens)
      .where(and(eq(labChapterScreens.setId, run.id), eq(labChapterScreens.chapterId, chapterId)));
    if (existing.length >= SCREEN_QUESTIONS) return { written: 0 };
    const info = chapterInfo(chapterId, profile?.addedChapters)!;
    await bumpGenerations(run.id);
    const { items, model } = await writeChapterScreen({ ...info, hint });
    await db().insert(labChapterScreens).values(items.map((item, itemIndex) => ({
      id: randomUUID(), userId, setId: run.id, runId: run.id, chapterId, itemIndex, item, promptVersion: SCREENER_PROMPT_VERSION, model,
    }))).onConflictDoNothing();
    return { written: items.length };
  }

  const sets = await db().select({ topicId: labAssessments.topicId }).from(labAssessments).where(eq(labAssessments.runId, run.id));
  const missing = chapter.topicIds.filter((topicId) => !sets.some((set) => set.topicId === topicId));
  if (!missing.length) return { written: 0 };
  const [lessons, previous] = await Promise.all([
    db().select({ snapshot: labLessons.snapshot }).from(labLessons).where(and(eq(labLessons.userId, userId), inArray(labLessons.topicId, missing))),
    db().select({ items: labAssessments.items }).from(labAssessments).where(and(eq(labAssessments.userId, userId), inArray(labAssessments.topicId, missing))).orderBy(desc(labAssessments.createdAt)).limit(30),
  ]);
  const avoid = [
    ...lessons.flatMap((lesson) => [lesson.snapshot.sections.workedExample.code, ...lesson.snapshot.practice.map((item) => item.prompt)]),
    ...previous.flatMap((set) => set.items.map((item) => item.prompt)),
  ].map(fingerprint);
  await bumpGenerations(run.id);
  const { byTopic, model } = await writeChapterAssessment(missing.map((topicId) => {
    const topic = findTopic(topicId)!;
    return { topic, packet: null, modes: runModes(topic), hint };
  }), avoid);
  const rows = Object.entries(byTopic).map(([topicId, items]) => ({
    id: randomUUID(), userId, topicId, kind: run.kind, items, promptVersion: ASSESSOR_PROMPT_VERSION, model, origin: "run" as const, runId: run.id,
  }));
  if (rows.length) await db().insert(labAssessments).values(rows);
  if (!rows.length) throw new LabInputError("The Assessor's questions came back incomplete. Try again.", 502);
  return { written: rows.length };
}

async function bumpGenerations(runId: string) {
  await db().update(labAssessmentRuns).set({ generations: sql`${labAssessmentRuns.generations} + 1` }).where(eq(labAssessmentRuns.id, runId));
}

export interface ScreenAnswerInput {
  screenId: string;
  text: string;
  selfRating: number;
}

/** Grades a screening answer. Screening never proves a topic; it only estimates the chapter's depth. */
export async function submitScreenAnswer(userId: string, input: ScreenAnswerInput) {
  const [screen] = await db().select().from(labChapterScreens).where(and(eq(labChapterScreens.id, input.screenId), eq(labChapterScreens.userId, userId))).limit(1);
  if (!screen) throw new LabInputError("Question not found. Reload the page", 404);
  if (screen.answeredAt) throw new LabInputError("This question already has an answer.", 409);
  if (!Number.isInteger(input.selfRating) || input.selfRating < 1 || input.selfRating > 5) throw new LabInputError("Rate how sure you are from 1 to 5 before answering.");
  const answer = input.text.trim();
  if (answer.length < 10) throw new LabInputError("Write at least a sentence.");
  if (screen.runId) {
    const run = await ownedRun(userId, screen.runId);
    if (run.completedAt) throw new LabInputError("This assessment is already finished.", 409);
  }
  const answered = await db().select({ itemIndex: labChapterScreens.itemIndex }).from(labChapterScreens)
    .where(and(eq(labChapterScreens.setId, screen.setId), eq(labChapterScreens.chapterId, screen.chapterId), isNotNull(labChapterScreens.answeredAt)));
  if (nextScreenQuestion(answered.map((row) => row.itemIndex)) !== screen.itemIndex) throw new LabInputError("Answer the questions in the order they're asked.", 409);
  const profile = await profileOf(userId);
  const info = chapterInfo(screen.chapterId, profile?.addedChapters);
  const grade = await gradeAnswer({ id: screen.chapterId, title: info?.title ?? screen.chapterId }, screen.item, answer);
  return db().transaction(async (tx) => {
    const updated = await tx.update(labChapterScreens).set({
      response: { text: answer.slice(0, 6000) }, selfRating: input.selfRating, label: grade.label, misconceptions: grade.misconceptions,
      feedback: grade.feedback, rubric: grade.rubric ?? null, answeredAt: new Date(),
    }).where(and(eq(labChapterScreens.id, screen.id), sql`${labChapterScreens.answeredAt} is null`)).returning({ id: labChapterScreens.id });
    if (!updated.length) throw new LabInputError("This question already has an answer.", 409);
    const runFinished = screen.runId ? await completeRunIfDone(tx, screen.runId) : false;
    return { label: grade.label, runFinished };
  });
}

/** Starts a short screen for a chapter you added after the baseline. The baseline itself never moves. */
export async function prepareAddedChapterScreen(userId: string, chapterId: string) {
  const profile = await profileOf(userId);
  const info = chapterInfo(chapterId, profile?.addedChapters);
  if (!info || findChapter(chapterId)) throw new LabInputError("Only chapters you added get their own screen.", 404);
  const existing = await db().select().from(labChapterScreens).where(and(eq(labChapterScreens.userId, userId), eq(labChapterScreens.chapterId, chapterId), sql`${labChapterScreens.runId} is null`));
  if (existing.length) return { setId: existing[0].setId };
  await assertBudget(userId);
  const { items, model } = await writeChapterScreen({ ...info, hint: intakeHint(profile?.intake) });
  const setId = randomUUID();
  await db().insert(labChapterScreens).values(items.map((item, itemIndex) => ({
    id: randomUUID(), userId, setId, runId: null, chapterId, itemIndex, item, promptVersion: SCREENER_PROMPT_VERSION, model,
  })));
  return { setId };
}

// ---- What the run page shows ----

export interface RunQuestion {
  chapterId: string;
  type: "topic" | "screen";
  /** The topic's question set id for topic questions, or the screen row id. */
  id: string;
  topicId: string | null;
  itemIndex: number;
  item: PublicItem;
  /** "Question 2 of about 6 in this chapter". Topic chapters are adaptive, so the total is an upper bound. */
  position: number;
  outOf: number;
}

export interface RunAnswerView {
  label: Label;
  voided: boolean;
  feedback: string;
  prompt: string;
  mode: string;
  answer: string;
  rubric: RubricResult[] | null;
  selfRating: number | null;
}

export interface RunChapterView {
  chapterId: string;
  title: string;
  area: string;
  kind: RunChapter["kind"];
  status: "not_started" | "in_progress" | "done";
  /** Topics already proven or placed before this run, so not asked. */
  skipped: string[];
  topics: { topicId: string; title: string; done: boolean; label: Label | null }[];
  answered: number;
  /** Topics whose questions came back incomplete and still need writing. */
  unwritten: number;
  /** Shown only once the chapter is done, so grades can't steer the rest of a closed-book chapter. */
  answers: RunAnswerView[];
}

export interface RunView {
  id: string;
  kind: RunKind;
  startedAt: string;
  completedAt: string | null;
  generations: number;
  allowance: number;
  chapters: RunChapterView[];
  /** The next question in the chapter being worked on, if any. */
  current: RunQuestion | null;
}

export async function latestRun(userId: string) {
  const [run] = await db().select().from(labAssessmentRuns).where(eq(labAssessmentRuns.userId, userId)).orderBy(desc(labAssessmentRuns.startedAt)).limit(1);
  return run ?? null;
}

export async function allRuns(userId: string) {
  return db().select().from(labAssessmentRuns).where(eq(labAssessmentRuns.userId, userId)).orderBy(asc(labAssessmentRuns.startedAt));
}

export async function getRunView(userId: string, runId: string, focusChapter?: string): Promise<RunView> {
  const run = await ownedRun(userId, runId);
  const profile = await profileOf(userId);
  const [sets, screens, attempts] = await Promise.all([
    db().select().from(labAssessments).where(eq(labAssessments.runId, run.id)),
    db().select().from(labChapterScreens).where(eq(labChapterScreens.setId, run.id)).orderBy(asc(labChapterScreens.itemIndex)),
    db().select().from(labAttempts).where(and(eq(labAttempts.userId, userId), inArray(labAttempts.kind, ["baseline", "checkpoint"]))),
  ]);
  const chapters: RunChapterView[] = [];
  let current: RunQuestion | null = null;

  for (const chapter of run.plan.chapters) {
    const info = chapterInfo(chapter.chapterId, profile?.addedChapters);
    const done = await chapterDone(db(), run, chapter);
    const view: RunChapterView = {
      chapterId: chapter.chapterId, title: info?.title ?? chapter.chapterId, area: info?.area ?? "", kind: chapter.kind,
      status: done ? "done" : "not_started", skipped: chapter.kind === "topics" ? chapter.skipped : [], topics: [], answered: 0, unwritten: 0, answers: [],
    };
    let next: RunQuestion | null = null;
    if (chapter.kind === "screen") {
      const rows = screens.filter((row) => row.chapterId === chapter.chapterId);
      const answeredRows = rows.filter((row) => row.answeredAt);
      view.answered = answeredRows.length;
      if (rows.length && !done) {
        const index = nextScreenQuestion(answeredRows.map((row) => row.itemIndex));
        const row = rows.find((item) => item.itemIndex === index);
        if (row) next = { chapterId: chapter.chapterId, type: "screen", id: row.id, topicId: null, itemIndex: row.itemIndex, item: toPublicItem(row.item), position: answeredRows.length + 1, outOf: SCREEN_QUESTIONS };
      }
      if (done) {
        view.answers = answeredRows.map((row) => ({
          label: row.label!, voided: false, feedback: row.feedback ?? "", prompt: row.item.prompt, mode: row.item.mode,
          answer: row.response?.text ?? "", rubric: row.rubric ?? null, selfRating: row.selfRating,
        }));
      }
    } else {
      let position = 1;
      for (const topicId of chapter.topicIds) {
        const set = sets.find((item) => item.topicId === topicId);
        const topicAttempts = set ? attempts.filter((attempt) => attempt.assessmentId === set.id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()) : [];
        if (!set) view.unwritten += 1;
        const nextIndex = set ? await nextRunItem(db(), set) : null;
        const topicDone = Boolean(set) && nextIndex === null;
        const counted = topicAttempts.filter((attempt) => !attempt.voided);
        const label = counted.length ? (counted.find((attempt) => attempt.label !== "solid")?.label ?? "solid") : null;
        view.topics.push({ topicId, title: findTopic(topicId)?.title ?? topicId, done: topicDone, label: done ? label : null });
        view.answered += topicAttempts.length;
        position += topicAttempts.length;
        if (!next && set && nextIndex !== null) {
          next = { chapterId: chapter.chapterId, type: "topic", id: set.id, topicId, itemIndex: nextIndex, item: toPublicItem(set.items[nextIndex]), position, outOf: chapter.topicIds.length * 2 };
        }
        if (done) {
          for (const attempt of topicAttempts) {
            view.answers.push({
              label: attempt.label, voided: attempt.voided, feedback: attempt.feedback, prompt: (attempt.item as { prompt?: string }).prompt ?? "",
              mode: attempt.mode, answer: attempt.response.text ?? attempt.response.lines?.join("\n") ?? "", rubric: attempt.rubric ?? null, selfRating: attempt.selfRating,
            });
          }
        }
      }
    }
    const prepared = chapter.kind === "screen" ? screens.some((row) => row.chapterId === chapter.chapterId) : sets.some((set) => chapter.topicIds.includes(set.topicId));
    if (!done && prepared) view.status = "in_progress";
    chapters.push(view);
    if (!current && next && (!focusChapter || focusChapter === chapter.chapterId)) current = next;
  }

  return {
    id: run.id, kind: run.kind, startedAt: run.startedAt.toISOString(), completedAt: run.completedAt?.toISOString() ?? null,
    generations: run.generations, allowance: runAllowance(run), chapters, current,
  };
}
