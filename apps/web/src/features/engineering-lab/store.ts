import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { gradeAnswer, researchTopic, TUTOR_PROMPT_VERSION, ASSESSOR_PROMPT_VERSION, writeAssessment, writeLesson } from "@ken-os/agents";
import {
  baselineLabelOf, computeProgress, finalizeLesson, gradeLabRun, gradePrediction, isPacketUsable, isoWeek, planNext, researchTargetFor, toPublicItem,
  type AssessmentItem, type AttemptKind, type AttemptRecord, type AttemptResponse, type BaselineEntry, type CodeRun, type Grade, type LessonSnapshot,
  type Mode, type PlanDecision, type PublicItem, type RubricResult, type SourcePacket, type TopicProgress,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labAssessments, labAttempts, labLessons, labProgress, labProgressChanges, labRadarItems, labSolutionReveals, labSourcePackets } from "@/lib/schema";
import { assessorModes, baseline, baselineAttempts, findLab, findTopic, labsForTopic, topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { assertRunTurn, completedBaseline, completeRunIfDone, topicIsClosedBook } from "./run-state";
import { labSolutions } from "./generated/lab-solutions.generated";
import { ownerDay, ownerDayStart } from "@/lib/day";

export { LabInputError };

/** Lessons, packets and question sets the AI may create per UTC day. Keeps a runaway loop or a stuck button cheap. */
export const DAILY_GENERATION_LIMIT = 20;

type Database = ReturnType<typeof db>;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function today() {
  return ownerDay();
}

function requireTopic(topicId: string) {
  const topic = findTopic(topicId);
  if (!topic) throw new LabInputError("Unknown topic.", 404);
  return topic;
}

export function toRecord(row: typeof labAttempts.$inferSelect): AttemptRecord {
  return {
    id: row.id, topicId: row.topicId, kind: row.kind, mode: row.mode, label: row.label, gradedBy: row.gradedBy,
    voided: row.voided, selfRating: row.selfRating, misconceptions: row.misconceptions, solutionSeen: row.solutionSeen,
    assessmentId: row.assessmentId, createdAt: row.createdAt,
  };
}

/**
 * The retired 2026-10-01 summary, replayed as attempts, but only until the in-app baseline is finished. After that
 * the baseline comes from your own answers. Design: docs/architecture/engineering-lab-profile.md, section 8.
 */
async function legacyBaseline(userId: string): Promise<AttemptRecord[]> {
  return (await completedBaseline(userId)) ? [] : baselineAttempts();
}

/** When the baseline was taken, and which one: the in-app run, or the retired summary until the run is finished. */
export async function baselineInfo(userId: string): Promise<{ on: string; source: "run" | "summary" }> {
  const run = await completedBaseline(userId);
  return run?.completedAt ? { on: run.completedAt.toISOString(), source: "run" } : { on: `${baseline.assessedOn}T12:00:00Z`, source: "summary" };
}

/** The baseline for one topic, in the shape the Tutor reads: from the in-app run once finished, else the old summary. */
export async function baselineEntryFor(userId: string, topicId: string): Promise<BaselineEntry | null> {
  if (!(await completedBaseline(userId))) return baseline.entries.find((entry) => entry.topicId === topicId) ?? null;
  const rows = await db().select().from(labAttempts).where(and(eq(labAttempts.userId, userId), eq(labAttempts.topicId, topicId), eq(labAttempts.kind, "baseline")));
  const label = baselineLabelOf(rows);
  if (!label) return null;
  const counted = rows.filter((row) => !row.voided).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return {
    topicId,
    label,
    mode: counted[0].mode,
    notes: counted.map((row) => row.feedback).join(" "),
    misconceptions: [...new Set(counted.flatMap((row) => row.misconceptions))],
  };
}

export async function generationsToday(userId: string) {
  const since = ownerDayStart();
  const [packets, lessons, assessments] = await Promise.all([
    db().select({ n: sql<number>`count(*)::int` }).from(labSourcePackets).where(and(eq(labSourcePackets.userId, userId), gte(labSourcePackets.createdAt, since))),
    db().select({ n: sql<number>`count(*)::int` }).from(labLessons).where(and(eq(labLessons.userId, userId), gte(labLessons.createdAt, since))),
    db().select({ n: sql<number>`count(*)::int` }).from(labAssessments).where(and(eq(labAssessments.userId, userId), gte(labAssessments.createdAt, since))),
  ]);
  return (packets[0]?.n ?? 0) + (lessons[0]?.n ?? 0) + (assessments[0]?.n ?? 0);
}

export async function assertBudget(userId: string, needed = 1) {
  const used = await generationsToday(userId);
  if (used + needed > DAILY_GENERATION_LIMIT) {
    throw new LabInputError(`Out of AI uses for today (${DAILY_GENERATION_LIMIT}). Resets at midnight Manila time`, 429);
  }
}

/**
 * Rebuilds a topic's progress from every attempt. The progress row is locked first, so two answers submitted at
 * the same moment can't both read the old status and record the same change twice.
 */
async function recompute(tx: Transaction, userId: string, topicId: string, causeAttemptId: string | null) {
  const topic = requireTopic(topicId);
  await tx.insert(labProgress).values({ userId, topicId, status: "NOT_STARTED", progress: emptyProgress(topicId) }).onConflictDoNothing();
  const [current] = await tx.select({ status: labProgress.status }).from(labProgress)
    .where(and(eq(labProgress.userId, userId), eq(labProgress.topicId, topicId))).for("update");
  const rows = await tx.select().from(labAttempts).where(and(eq(labAttempts.userId, userId), eq(labAttempts.topicId, topicId)));
  const [lesson] = await tx.select({ id: labLessons.id }).from(labLessons).where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId))).limit(1);
  const { progress } = computeProgress(topic, [...(await legacyBaseline(userId)), ...rows.map(toRecord)], Boolean(lesson));
  await tx.update(labProgress).set({ status: progress.status, progress, updatedAt: new Date() })
    .where(and(eq(labProgress.userId, userId), eq(labProgress.topicId, topicId)));
  if (current && current.status !== progress.status) {
    const latest = rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    await tx.insert(labProgressChanges).values({
      id: randomUUID(), userId, topicId, fromStatus: current.status, toStatus: progress.status, attemptId: causeAttemptId,
      reason: causeAttemptId && latest ? `${latest.kind} ${latest.mode} answer graded ${latest.label}` : rows.length ? "recalculated" : "lesson started",
    });
  }
  return progress;
}

function emptyProgress(topicId: string): TopicProgress {
  const topic = requireTopic(topicId);
  return computeProgress(topic, baselineAttempts(), false).progress;
}

/**
 * Progress is always rebuilt from attempts, the source of truth, so a change to the topic map (for example a new
 * proof mode) can never leave a stale status on screen. lab_progress only remembers the last status for the change log.
 */
export async function getAllProgress(userId: string): Promise<TopicProgress[]> {
  const [rows, lessons, legacy] = await Promise.all([
    db().select().from(labAttempts).where(eq(labAttempts.userId, userId)),
    db().selectDistinct({ topicId: labLessons.topicId }).from(labLessons).where(eq(labLessons.userId, userId)),
    legacyBaseline(userId),
  ]);
  const attempts = [...legacy, ...rows.map(toRecord)];
  const started = new Set(lessons.map((row) => row.topicId));
  return topicMap.topics.map((topic) => computeProgress(topic, attempts, started.has(topic.id)).progress);
}

/** Recalculates one topic and logs a status change if there is one. */
export async function rebuildProgress(userId: string, topicId: string) {
  return db().transaction((tx) => recompute(tx, userId, topicId, null));
}

async function latestLabels(userId: string) {
  const rows = await db().select({ topicId: labAttempts.topicId, label: labAttempts.label, createdAt: labAttempts.createdAt })
    .from(labAttempts).where(and(eq(labAttempts.userId, userId), eq(labAttempts.voided, false))).orderBy(desc(labAttempts.createdAt)).limit(200);
  const latest: Record<string, string> = {};
  for (const row of rows) latest[row.topicId] ??= row.label;
  return latest;
}

export interface TodayView {
  plan: PlanDecision | null;
  progress: TopicProgress[];
  reviewsDue: string[];
  recentlyValidated: { topicId: string; at: string }[];
  recentChanges: { topicId: string; from: string; to: string; reason: string; at: string }[];
  generationsUsed: number;
  generationLimit: number;
}

export async function getToday(userId: string): Promise<TodayView> {
  const now = new Date();
  const [progress, latestLabel, changes, used] = await Promise.all([
    getAllProgress(userId),
    latestLabels(userId),
    db().select().from(labProgressChanges).where(eq(labProgressChanges.userId, userId)).orderBy(desc(labProgressChanges.createdAt)).limit(8),
    generationsToday(userId),
  ]);
  return {
    plan: planNext({ map: topicMap, progress, latestLabel, now }),
    progress,
    reviewsDue: progress.filter((item) => item.status === "NEEDS_REVISIT" || (item.status === "VALIDATED" && item.nextReviewAt && new Date(item.nextReviewAt) <= now)).map((item) => item.topicId),
    recentlyValidated: progress.filter((item) => item.validatedAt).sort((a, b) => b.validatedAt!.localeCompare(a.validatedAt!)).slice(0, 5).map((item) => ({ topicId: item.topicId, at: item.validatedAt! })),
    recentChanges: changes.map((row) => ({ topicId: row.topicId, from: row.fromStatus, to: row.toStatus, reason: row.reason, at: row.createdAt.toISOString() })),
    generationsUsed: used,
    generationLimit: DAILY_GENERATION_LIMIT,
  };
}

async function latestPacket(userId: string, topicId: string) {
  const [row] = await db().select().from(labSourcePackets)
    .where(and(eq(labSourcePackets.userId, userId), eq(labSourcePackets.topicId, topicId))).orderBy(desc(labSourcePackets.generatedAt)).limit(1);
  return row ?? null;
}

export async function savePacket(userId: string, packet: SourcePacket) {
  const id = randomUUID();
  const inserted = await db().insert(labSourcePackets).values({
    id, userId, topicId: packet.topicId, packet, refreshAfter: packet.refreshAfter, generatedAt: new Date(packet.generatedAt),
  }).onConflictDoNothing().returning({ id: labSourcePackets.id });
  return inserted[0]?.id ?? null;
}

/**
 * Researches the topic again only when its newest packet is past its refresh date. For a proven topic, the Researcher
 * also compares against the old packet, and changed facts flag the topic for re-checking on the radar.
 */
async function freshPacket(userId: string, topicId: string) {
  const existing = await latestPacket(userId, topicId);
  if (existing && existing.refreshAfter >= today()) return existing;
  await assertBudget(userId);
  const proven = existing ? (await getAllProgress(userId)).find((item) => item.topicId === topicId)?.status === "VALIDATED" : false;
  const previousClaims = proven && existing ? existing.packet.claims.map((claim) => claim.statement) : [];
  const packet = await researchTopic(researchTargetFor(requireTopic(topicId)), previousClaims);
  if (!isPacketUsable(packet)) throw new LabInputError("The Researcher found no usable official sources. Try again later.", 502);
  await savePacket(userId, packet);
  if (proven && packet.changedSinceLast?.length) await flagRecheck(userId, topicId, packet);
  return (await latestPacket(userId, topicId))!;
}

/** A proven topic whose facts changed gets a re-check flag: the proof was earned against the old facts. */
export async function flagRecheck(userId: string, topicId: string, packet: SourcePacket) {
  const topic = requireTopic(topicId);
  const chapter = topicMap.modules.find((module) => module.id === topic.module)!;
  await db().insert(labRadarItems).values({
    id: randomUUID(), userId, week: isoWeek(new Date()), area: chapter.area, tag: "recheck", topicId,
    title: `Re-check ${topic.title}`,
    reason: packet.changedSinceLast!.slice(0, 2).join(" "),
    sourceUrl: packet.sources[0]?.url ?? null,
  });
}

export async function generateLesson(userId: string, topicId: string) {
  const topic = requireTopic(topicId);
  if (await topicIsClosedBook(userId, topicId)) throw new LabInputError("Your assessment is in progress, so lessons for its topics stay closed until you finish it.", 409);
  const packet = await freshPacket(userId, topicId);
  await assertBudget(userId);
  const progress = (await getAllProgress(userId)).find((item) => item.topicId === topicId)!;
  const recent = await db().select({ mode: labAttempts.mode, label: labAttempts.label, feedback: labAttempts.feedback }).from(labAttempts)
    .where(and(eq(labAttempts.userId, userId), eq(labAttempts.topicId, topicId))).orderBy(desc(labAttempts.createdAt)).limit(5);
  const { draft, model } = await writeLesson({
    topic,
    packet: packet.packet,
    baseline: await baselineEntryFor(userId, topicId),
    openMisconceptions: progress.weaknesses,
    recentAttempts: recent.reverse(),
  });
  return db().transaction(async (tx) => {
    const [last] = await tx.select({ version: labLessons.version }).from(labLessons)
      .where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId))).orderBy(desc(labLessons.version)).limit(1);
    const version = (last?.version ?? 0) + 1;
    const snapshot = finalizeLesson(draft, packet.packet, {
      topicId, version, sourcePacketId: packet.id, promptVersion: TUTOR_PROMPT_VERSION, model, labIds: labsForTopic(topicId).map((lab) => lab.id),
    });
    const id = randomUUID();
    await tx.insert(labLessons).values({ id, userId, topicId, version, sourcePacketId: packet.id, snapshot });
    await recompute(tx, userId, topicId, null);
    return { id, version };
  });
}

function fingerprint(prompt: string) {
  return prompt.replace(/\s+/g, " ").trim().slice(0, 100);
}

export type AssessmentKind = "assessment" | "review" | "placement";

export async function generateAssessment(userId: string, topicId: string, kind: AssessmentKind) {
  const topic = requireTopic(topicId);
  const modes = assessorModes(topic);
  if (!modes.length) throw new LabInputError("This topic is proven entirely by its labs.", 409);
  if (kind === "placement") {
    // A placement check is for a topic you haven't started; once you're learning it, the normal check applies.
    const progress = (await getAllProgress(userId)).find((item) => item.topicId === topicId)!;
    if (progress.status !== "NOT_STARTED") throw new LabInputError("Placement checks are only for topics you haven't started.", 409);
  }
  await assertBudget(userId);
  const [lessons, previous, packet] = await Promise.all([
    db().select({ snapshot: labLessons.snapshot }).from(labLessons).where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId))),
    db().select({ items: labAssessments.items }).from(labAssessments).where(and(eq(labAssessments.userId, userId), eq(labAssessments.topicId, topicId))).orderBy(desc(labAssessments.createdAt)).limit(5),
    latestPacket(userId, topicId),
  ]);
  const avoid = [
    ...lessons.flatMap((lesson) => [lesson.snapshot.sections.workedExample.code, ...lesson.snapshot.practice.map((item) => item.prompt)]),
    ...previous.flatMap((set) => set.items.map((item) => item.prompt)),
  ].map(fingerprint);
  const { items, model } = await writeAssessment({ topic, packet: packet?.packet ?? null, modes, avoid });
  const id = randomUUID();
  await db().insert(labAssessments).values({ id, userId, topicId, kind, items, promptVersion: ASSESSOR_PROMPT_VERSION, model });
  return { id };
}

async function insertAttempt(tx: Transaction, values: Omit<typeof labAttempts.$inferInsert, "id">) {
  const id = randomUUID();
  const inserted = await tx.insert(labAttempts).values({ ...values, id }).onConflictDoNothing().returning({ id: labAttempts.id });
  if (!inserted.length) throw new LabInputError("This question already has an answer.", 409);
  return id;
}

function gradeFields(grade: Grade) {
  return { label: grade.label, gradedBy: grade.by, voided: grade.voided ?? false, misconceptions: grade.misconceptions, feedback: grade.feedback, run: grade.run ?? null, rubric: grade.rubric ?? null };
}

export interface AnswerInput {
  assessmentId: string;
  itemIndex: number;
  response: AttemptResponse;
  selfRating: number;
  /** What the snippet printed when the learner's browser ran it. Only for predict questions. */
  actualOutput?: string[];
}

export async function submitAnswer(userId: string, input: AnswerInput) {
  const [assessment] = await db().select().from(labAssessments).where(and(eq(labAssessments.id, input.assessmentId), eq(labAssessments.userId, userId))).limit(1);
  if (!assessment) throw new LabInputError("Question set not found. Reload the page", 404);
  const item = assessment.items[input.itemIndex];
  if (!item) throw new LabInputError("Question not found. Reload the page", 404);
  if (!Number.isInteger(input.selfRating) || input.selfRating < 1 || input.selfRating > 5) throw new LabInputError("Rate how sure you are from 1 to 5 before answering.");
  const [existing] = await db().select({ id: labAttempts.id }).from(labAttempts)
    .where(and(eq(labAttempts.assessmentId, assessment.id), eq(labAttempts.itemIndex, input.itemIndex))).limit(1);
  if (existing) throw new LabInputError("This question already has an answer.", 409);
  await assertRunTurn(assessment, input.itemIndex);

  let grade: Grade;
  if (item.mode === "predict") {
    if (!input.actualOutput || !input.response.lines) throw new LabInputError("A prediction needs your answer and the real output.");
    grade = gradePrediction(input.response.lines, input.actualOutput, item.expectedOutput);
  } else {
    const answer = input.response.text?.trim() ?? "";
    if (answer.length < 10) throw new LabInputError("Write at least a sentence.");
    if (!process.env.OPENAI_API_KEY) throw new LabInputError("Grader isn't set up", 503);
    grade = await gradeAnswer(requireTopic(assessment.topicId), item, answer);
  }

  return db().transaction(async (tx) => {
    const attemptId = await insertAttempt(tx, {
      userId, topicId: assessment.topicId, kind: assessment.kind, mode: item.mode, assessmentId: assessment.id, itemIndex: input.itemIndex,
      item: item as unknown as Record<string, unknown>, response: { ...input.response, ...(input.actualOutput ? { actual: input.actualOutput } : {}) } as AttemptResponse,
      selfRating: input.selfRating, ...gradeFields(grade),
    });
    const progress = await recompute(tx, userId, assessment.topicId, attemptId);
    const runFinished = assessment.runId ? await completeRunIfDone(tx, assessment.runId) : false;
    return { attemptId, grade, status: progress.status, runFinished };
  });
}

export async function submitPractice(userId: string, input: { lessonId: string; practiceIndex: number; lines: string[]; why?: string; actualOutput: string[] }) {
  const [lesson] = await db().select().from(labLessons).where(and(eq(labLessons.id, input.lessonId), eq(labLessons.userId, userId))).limit(1);
  if (!lesson) throw new LabInputError("Lesson not found. Reload the page", 404);
  const item = lesson.snapshot.practice[input.practiceIndex];
  if (!item || item.kind !== "predict") throw new LabInputError("Only predict practice is recorded.");
  // Once a practice prediction is right, more attempts only add duplicate history.
  const [last] = await db().select({ label: labAttempts.label, voided: labAttempts.voided }).from(labAttempts)
    .where(and(eq(labAttempts.userId, userId), eq(labAttempts.lessonId, lesson.id), eq(labAttempts.itemIndex, input.practiceIndex)))
    .orderBy(desc(labAttempts.createdAt)).limit(1);
  if (last?.label === "solid" && !last.voided) throw new LabInputError("You already got this one right.", 409);
  const grade = gradePrediction(input.lines, input.actualOutput, item.expectedOutput);
  const why = input.why?.trim();
  return db().transaction(async (tx) => {
    const attemptId = await insertAttempt(tx, {
      userId, topicId: lesson.topicId, kind: "lesson", mode: "predict", lessonId: lesson.id, itemIndex: input.practiceIndex,
      item: item as unknown as Record<string, unknown>, response: { lines: input.lines, actual: input.actualOutput, ...(why ? { why } : {}) }, selfRating: null, ...gradeFields(grade),
    });
    const progress = await recompute(tx, userId, lesson.topicId, attemptId);
    return { grade, status: progress.status };
  });
}

export async function submitLabRun(userId: string, input: { labId: string; code: string; run: CodeRun }) {
  const lab = findLab(input.labId);
  if (!lab) throw new LabInputError("Unknown lab.", 404);
  const [reveal] = await db().select().from(labSolutionReveals).where(and(eq(labSolutionReveals.userId, userId), eq(labSolutionReveals.labId, lab.id))).limit(1);
  const grade = gradeLabRun(input.run);
  return db().transaction(async (tx) => {
    const statuses: Record<string, string> = {};
    for (const topicId of lab.topics) {
      for (const mode of lab.modes) {
        const attemptId = await insertAttempt(tx, {
          userId, topicId, kind: "lab" as AttemptKind, mode: mode as Mode, labId: lab.id,
          item: { labId: lab.id, title: lab.title }, response: { code: input.code.slice(0, 50_000) },
          selfRating: null, solutionSeen: Boolean(reveal), ...gradeFields(grade),
        });
        statuses[topicId] = (await recompute(tx, userId, topicId, attemptId)).status;
      }
    }
    return { grade, solutionSeen: Boolean(reveal), statuses };
  });
}

/** Records that the solution was shown, so later passes of this lab can't count as proof. */
export async function revealSolution(userId: string, labId: string) {
  if (!findLab(labId) || !labSolutions[labId]) throw new LabInputError("Unknown lab.", 404);
  await db().insert(labSolutionReveals).values({ userId, labId }).onConflictDoNothing();
  return labSolutions[labId];
}

/** What the learner typed, shown back with the grade so it survives a page refresh. */
export interface SavedAnswer {
  lines: string[] | null;
  text: string | null;
  why: string | null;
  /** What the code really printed, for a prediction. Lets the page show the line-by-line diff. */
  actual: string[] | null;
}

function savedAnswer(response: AttemptResponse | null, fallbackActual: string[] | null = null): SavedAnswer {
  return { lines: response?.lines ?? null, text: response?.text ?? null, why: response?.why ?? null, actual: response?.actual ?? (response?.lines ? fallbackActual : null) };
}

export interface TopicView {
  progress: TopicProgress;
  lesson: (LessonSnapshot & { id: string; createdAt: string }) | null;
  lessonCount: number;
  sources: SourcePacket["sources"];
  sourceCheckedAt: string | null;
  assessment: {
    id: string; kind: string; createdAt: string;
    items: (PublicItem & { answered: null | { label: string; feedback: string; voided: boolean; answer: SavedAnswer; explanation: string | null; rubric: RubricResult[] | null } })[];
  } | null;
  attempts: { id: string; kind: string; mode: string; label: string; gradedBy: string; voided: boolean; feedback: string; createdAt: string }[];
  revealedLabs: string[];
  /** Labs with a full pass that counts as proof: run without having seen the solution first. */
  passedLabs: string[];
  /** A validated topic whose next review date has arrived. */
  reviewDue: boolean;
  practiceResults: Record<number, { label: string; feedback: string; voided: boolean; answer: SavedAnswer }>;
  /** When the baseline this topic's label comes from was taken. */
  baseline: { on: string; source: "run" | "summary" };
  /** An assessment that asks about this topic is in progress, so its lesson stays closed. */
  closedBook: boolean;
}

export async function getTopicView(userId: string, topicId: string): Promise<TopicView> {
  requireTopic(topicId);
  const [progress, lessons, packet, assessments, attempts, reveals, passes, baselineWhen, closedBook] = await Promise.all([
    getAllProgress(userId).then((all) => all.find((item) => item.topicId === topicId)!),
    db().select().from(labLessons).where(and(eq(labLessons.userId, userId), eq(labLessons.topicId, topicId))).orderBy(desc(labLessons.version)),
    latestPacket(userId, topicId),
    // Only the topic page's own question sets: run and daily-practice questions are answered where they were asked.
    db().select().from(labAssessments).where(and(eq(labAssessments.userId, userId), eq(labAssessments.topicId, topicId), eq(labAssessments.origin, "topic"))).orderBy(desc(labAssessments.createdAt)).limit(1),
    db().select().from(labAttempts).where(and(eq(labAttempts.userId, userId), eq(labAttempts.topicId, topicId))).orderBy(desc(labAttempts.createdAt)).limit(60),
    db().select({ labId: labSolutionReveals.labId }).from(labSolutionReveals).where(eq(labSolutionReveals.userId, userId)),
    db().selectDistinct({ labId: labAttempts.labId }).from(labAttempts).where(and(
      eq(labAttempts.userId, userId), eq(labAttempts.topicId, topicId), eq(labAttempts.kind, "lab"),
      eq(labAttempts.label, "solid"), eq(labAttempts.solutionSeen, false), eq(labAttempts.voided, false),
    )),
    baselineInfo(userId),
    topicIsClosedBook(userId, topicId),
  ]);
  const lesson = lessons[0];
  const assessment = assessments[0];
  const lessonPacket = lesson ? (await db().select().from(labSourcePackets).where(eq(labSourcePackets.id, lesson.sourcePacketId)).limit(1))[0] : packet;
  const practiceResults: TopicView["practiceResults"] = {};
  for (const attempt of attempts) {
    if (lesson && attempt.lessonId === lesson.id && attempt.itemIndex !== null) {
      // Older practice answers didn't store the real output; a non-voided one matched the expected output, so that stands in.
      const practiceItem = lesson.snapshot.practice[attempt.itemIndex];
      const expected = practiceItem?.kind === "predict" && !attempt.voided ? practiceItem.expectedOutput : null;
      practiceResults[attempt.itemIndex] ??= { label: attempt.label, feedback: attempt.feedback, voided: attempt.voided, answer: savedAnswer(attempt.response, expected) };
    }
  }
  return {
    progress,
    lesson: lesson ? { ...lesson.snapshot, id: lesson.id, createdAt: lesson.createdAt.toISOString() } : null,
    lessonCount: lessons.length,
    sources: lessonPacket?.packet.sources ?? [],
    sourceCheckedAt: lessonPacket?.packet.sourceCheckedAt ?? null,
    assessment: assessment ? {
      id: assessment.id,
      kind: assessment.kind,
      createdAt: assessment.createdAt.toISOString(),
      items: assessment.items.map((item: AssessmentItem, index) => {
        const answer = attempts.find((attempt) => attempt.assessmentId === assessment.id && attempt.itemIndex === index);
        return {
          ...toPublicItem(item),
          answered: answer ? {
            label: answer.label, feedback: answer.feedback, voided: answer.voided, answer: savedAnswer(answer.response),
            explanation: item.mode === "predict" ? item.explanation ?? null : null, rubric: answer.rubric ?? null,
          } : null,
        };
      }),
    } : null,
    attempts: attempts.map((attempt) => ({
      id: attempt.id, kind: attempt.kind, mode: attempt.mode, label: attempt.label, gradedBy: attempt.gradedBy,
      voided: attempt.voided, feedback: attempt.feedback, createdAt: attempt.createdAt.toISOString(),
    })),
    revealedLabs: reveals.map((row) => row.labId),
    passedLabs: passes.map((row) => row.labId).filter((id): id is string => Boolean(id)),
    reviewDue: progress.status === "VALIDATED" && Boolean(progress.nextReviewAt) && new Date(progress.nextReviewAt!) <= new Date(),
    practiceResults,
    baseline: baselineWhen,
    closedBook,
  };
}
