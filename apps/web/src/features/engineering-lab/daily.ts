import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { ASSESSOR_PROMPT_VERSION, writeChapterAssessment } from "@ken-os/agents";
import { toPublicItem, type DailyItem, type Mode, type PublicItem, type RubricResult, type TopicProgress } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labAssessments, labAttempts, labDailySets } from "@/lib/schema";
import { assessorModes, findLab, findTopic, labsForTopic } from "./curriculum";
import { LabInputError } from "./errors";
import { activeRun } from "./run-state";
import { assertBudget, getAllProgress, type SavedAnswer } from "./store";

// Daily practice, as designed in docs/architecture/engineering-lab-v1.md section 9, first in the lab home's Today strip.

/** Topics a day's set draws on, at most four, in the order v1 section 9 gives. */
export function pickDailyTopics(progress: TopicProgress[], now: Date): { topicIds: string[]; warmUp: boolean } {
  const picked: string[] = [];
  const take = (items: TopicProgress[]) => { for (const item of items) if (picked.length < 4 && !picked.includes(item.topicId)) picked.push(item.topicId); };
  const proven = progress.filter((item) => item.status === "VALIDATED" || item.status === "NEEDS_REVISIT");
  const inProgress = progress.filter((item) => item.status === "LEARNING" || item.status === "PRACTICING");
  if (!proven.length) {
    // Before anything is proven: a short warm-up from topics in progress instead.
    take(inProgress.filter((item) => item.weaknesses.length));
    take(inProgress);
    return { topicIds: picked.slice(0, 3), warmUp: true };
  }
  take(progress.filter((item) => item.status === "NEEDS_REVISIT" || (item.status === "VALIDATED" && item.nextReviewAt && new Date(item.nextReviewAt) <= now)));
  take(progress.filter((item) => item.status === "VALIDATED").sort((a, b) => (a.lastAttemptAt ?? "").localeCompare(b.lastAttemptAt ?? "")).slice(0, 2));
  take(progress.filter((item) => item.weaknesses.length && item.status !== "VALIDATED"));
  take(inProgress.slice(0, 1));
  return { topicIds: picked, warmUp: false };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export interface DailyItemView {
  type: "question" | "lab";
  topicId: string;
  topicTitle: string;
  assessmentId: string | null;
  itemIndex: number | null;
  item: PublicItem | null;
  labId: string | null;
  labTitle: string | null;
  answered: null | { label: string; feedback: string; voided: boolean; answer: SavedAnswer; explanation: string | null; rubric: RubricResult[] | null };
  /** For a lab: passed today without first seeing the solution. */
  passedToday: boolean;
}

export interface DailyView {
  day: string;
  warmUp: boolean;
  items: DailyItemView[];
  done: boolean;
}

export async function getDailySet(userId: string): Promise<DailyView | null> {
  const day = today();
  const [set] = await db().select().from(labDailySets).where(and(eq(labDailySets.userId, userId), eq(labDailySets.day, day))).limit(1);
  if (!set) return null;
  const assessmentIds = set.items.flatMap((item) => item.type === "question" ? [item.assessmentId] : []);
  const [sets, attempts, labRuns] = await Promise.all([
    assessmentIds.length ? db().select().from(labAssessments).where(inArray(labAssessments.id, assessmentIds)) : Promise.resolve([]),
    assessmentIds.length ? db().select().from(labAttempts).where(inArray(labAttempts.assessmentId, assessmentIds)) : Promise.resolve([]),
    db().select({ labId: labAttempts.labId }).from(labAttempts).where(and(
      eq(labAttempts.userId, userId), eq(labAttempts.kind, "lab"), eq(labAttempts.label, "solid"), eq(labAttempts.solutionSeen, false),
      gte(labAttempts.createdAt, new Date(`${day}T00:00:00Z`)),
    )),
  ]);
  const items = set.items.map((entry): DailyItemView => {
    const topicTitle = findTopic(entry.topicId)?.title ?? entry.topicId;
    if (entry.type === "lab") {
      return { type: "lab", topicId: entry.topicId, topicTitle, assessmentId: null, itemIndex: null, item: null, labId: entry.labId, labTitle: findLab(entry.labId)?.title ?? entry.labId, answered: null, passedToday: labRuns.some((run) => run.labId === entry.labId) };
    }
    const question = sets.find((row) => row.id === entry.assessmentId)?.items[entry.itemIndex];
    const attempt = attempts.find((row) => row.assessmentId === entry.assessmentId && row.itemIndex === entry.itemIndex);
    return {
      type: "question", topicId: entry.topicId, topicTitle, assessmentId: entry.assessmentId, itemIndex: entry.itemIndex,
      item: question ? toPublicItem(question) : null, labId: null, labTitle: null, passedToday: false,
      answered: attempt ? {
        label: attempt.label, feedback: attempt.feedback, voided: attempt.voided,
        answer: { lines: attempt.response.lines ?? null, text: attempt.response.text ?? null, why: attempt.response.why ?? null, actual: attempt.response.actual ?? null },
        explanation: question?.mode === "predict" ? question.explanation ?? null : null, rubric: attempt.rubric ?? null,
      } : null,
    };
  });
  return { day, warmUp: set.warmUp, items, done: items.filter((item) => item.type === "question").every((item) => item.answered) };
}

/** Writes today's set: one AI call for its questions, plus one authored lab from a proven topic. Stable for the day. */
export async function generateDailySet(userId: string): Promise<DailyView> {
  const existing = await getDailySet(userId);
  if (existing) return existing;
  if (await activeRun(userId)) throw new LabInputError("Finish your assessment first; daily practice starts after it.", 409);
  const progress = await getAllProgress(userId);
  const { topicIds, warmUp } = pickDailyTopics(progress, new Date());
  if (!topicIds.length) throw new LabInputError("Nothing to practise yet. Start a topic first.", 409);
  await assertBudget(userId);

  // One or two predictions, the rest short explanations, so the set mixes recall with reasoning.
  let predictions = 0;
  const plan = topicIds.map((topicId) => {
    const topic = findTopic(topicId)!;
    const modes = assessorModes(topic);
    const mode: Mode = modes.includes("predict") && predictions < 2 ? "predict" : modes.find((item) => item !== "predict") ?? "explain";
    if (mode === "predict") predictions += 1;
    return { topic, mode };
  });
  const previous = await db().select({ items: labAssessments.items }).from(labAssessments)
    .where(and(eq(labAssessments.userId, userId), inArray(labAssessments.topicId, topicIds))).orderBy(desc(labAssessments.createdAt)).limit(20);
  const avoid = previous.flatMap((set) => set.items.map((item) => item.prompt.replace(/\s+/g, " ").trim().slice(0, 100)));
  const { byTopic, model } = await writeChapterAssessment(plan.map(({ topic, mode }) => ({ topic, packet: null, modes: [mode] })), avoid, "practice");

  const items: DailyItem[] = [];
  const rows: (typeof labAssessments.$inferInsert)[] = [];
  for (const { topic } of plan) {
    const questions = byTopic[topic.id];
    if (!questions?.length) continue;
    const status = progress.find((item) => item.topicId === topic.id)?.status;
    const id = randomUUID();
    rows.push({ id, userId, topicId: topic.id, kind: status === "VALIDATED" || status === "NEEDS_REVISIT" ? "review" : "assessment", items: questions, promptVersion: ASSESSOR_PROMPT_VERSION, model, origin: "daily" });
    items.push({ type: "question", topicId: topic.id, assessmentId: id, itemIndex: 0 });
  }
  if (!rows.length) throw new LabInputError("The Assessor's questions came back incomplete. Try again.", 502);
  // One hands-on fix: an authored code lab from a proven topic, started again from its starter code.
  const provenWithLab = progress.filter((item) => item.status === "VALIDATED")
    .sort((a, b) => (a.lastAttemptAt ?? "").localeCompare(b.lastAttemptAt ?? ""))
    .flatMap((item) => labsForTopic(item.topicId).filter((lab) => lab.runner !== "probe").map((lab) => ({ topicId: item.topicId, labId: lab.id })));
  if (provenWithLab[0]) items.splice(Math.min(1, items.length), 0, { type: "lab", ...provenWithLab[0] });

  await db().transaction(async (tx) => {
    await tx.insert(labAssessments).values(rows);
    await tx.insert(labDailySets).values({ userId, day: today(), items, warmUp }).onConflictDoNothing();
  });
  return (await getDailySet(userId))!;
}

