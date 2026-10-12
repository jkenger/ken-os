import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { researchTopic } from "@ken-os/agents";
import {
  computeProgress,
  emptyProgress,
  isPacketUsable,
  isoWeek,
  researchTargetFor,
  type SourcePacket,
  type TopicEvent,
  type TopicProgress,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labLessons, labProgress, labQuestions, labRadarItems, labSourcePackets, labTopicEvents } from "@/lib/schema";
import { ownerDay, ownerDayStart } from "@/lib/day";
import { findTopic, topicMap } from "./curriculum";
import { LabInputError } from "./errors";

// Topic progress, source packets and the AI-use limit. Spec: docs/architecture/engineering-rebuild.md, sections 2 and 6.
// Progress is rebuilt from lab_topic_events, the source of truth; lab_progress only caches the result.

export { LabInputError };

/** Source packets, lessons and questions the AI may write per day. Keeps a runaway loop or a stuck button cheap. */
export const DAILY_GENERATION_LIMIT = 20;

type Database = ReturnType<typeof db>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function requireTopic(topicId: string) {
  const topic = findTopic(topicId);
  if (!topic) throw new LabInputError("Unknown topic.", 404);
  return topic;
}

/** Ken OS's own AI writes today. Lessons and questions Claude saved cost Ken OS nothing and don't count. */
export async function generationsToday(userId: string) {
  const since = ownerDayStart();
  const count = async (table: typeof labSourcePackets | typeof labLessons | typeof labQuestions) => {
    const own = "source" in table ? ne(table.source, "claude") : undefined;
    const [row] = await db()
      .select({ n: sql<number>`count(*)::int` })
      .from(table)
      .where(and(eq(table.userId, userId), gte(table.createdAt, since), own));
    return row?.n ?? 0;
  };
  const counts = await Promise.all([count(labSourcePackets), count(labLessons), count(labQuestions)]);
  return counts.reduce((sum, n) => sum + n, 0);
}

export async function assertBudget(userId: string, needed = 1) {
  const used = await generationsToday(userId);
  if (used + needed > DAILY_GENERATION_LIMIT) {
    throw new LabInputError(
      `Out of AI uses for today (${DAILY_GENERATION_LIMIT}). Resets at midnight Manila time`,
      429,
    );
  }
}

function toEvent(
  row: Pick<typeof labTopicEvents.$inferSelect, "id" | "topicId" | "kind" | "passed" | "label" | "createdAt">,
): TopicEvent {
  return {
    id: row.id,
    topicId: row.topicId,
    kind: row.kind,
    passed: row.passed,
    label: row.label,
    createdAt: row.createdAt,
  };
}

const eventColumns = {
  id: labTopicEvents.id,
  topicId: labTopicEvents.topicId,
  kind: labTopicEvents.kind,
  passed: labTopicEvents.passed,
  label: labTopicEvents.label,
  createdAt: labTopicEvents.createdAt,
};

/** Every topic's progress, in course order, rebuilt from events. */
export async function getAllProgress(userId: string): Promise<TopicProgress[]> {
  const rows = await db().select(eventColumns).from(labTopicEvents).where(eq(labTopicEvents.userId, userId));
  const events = rows.map(toEvent);
  return topicMap.topics.map((topic) => computeProgress(topic.id, events));
}

export async function getProgress(userId: string, topicId: string): Promise<TopicProgress> {
  requireTopic(topicId);
  const rows = await db()
    .select(eventColumns)
    .from(labTopicEvents)
    .where(and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.topicId, topicId)));
  return computeProgress(topicId, rows.map(toEvent));
}

/** Topic ids that are Proven. */
export async function provenTopics(userId: string): Promise<Set<string>> {
  return new Set((await getAllProgress(userId)).filter((item) => item.state === "PROVEN").map((item) => item.topicId));
}

/**
 * Rebuilds one topic's cached progress. The row is locked first, so two events saved at the same moment can't both
 * read the old state.
 */
async function recompute(tx: Transaction, userId: string, topicId: string) {
  await tx
    .insert(labProgress)
    .values({ userId, topicId, status: "NOT_STARTED", progress: emptyProgress(topicId) })
    .onConflictDoNothing();
  await tx
    .select({ status: labProgress.status })
    .from(labProgress)
    .where(and(eq(labProgress.userId, userId), eq(labProgress.topicId, topicId)))
    .for("update");
  const rows = await tx
    .select(eventColumns)
    .from(labTopicEvents)
    .where(and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.topicId, topicId)));
  const progress = computeProgress(topicId, rows.map(toEvent));
  await tx
    .update(labProgress)
    .set({ status: progress.state, progress, updatedAt: new Date() })
    .where(and(eq(labProgress.userId, userId), eq(labProgress.topicId, topicId)));
  return progress;
}

export type EventInput = Omit<typeof labTopicEvents.$inferInsert, "id" | "userId" | "createdAt">;

/** Saves one event and returns the topic's new progress. */
export async function recordEvent(userId: string, event: EventInput, tx?: Transaction) {
  requireTopic(event.topicId);
  const write = async (inner: Transaction) => {
    const id = randomUUID();
    await inner.insert(labTopicEvents).values({ ...event, id, userId });
    return { id, progress: await recompute(inner, userId, event.topicId) };
  };
  return tx ? write(tx) : db().transaction(write);
}

export async function latestPacket(userId: string, topicId: string) {
  const [row] = await db()
    .select()
    .from(labSourcePackets)
    .where(and(eq(labSourcePackets.userId, userId), eq(labSourcePackets.topicId, topicId)))
    .orderBy(desc(labSourcePackets.generatedAt))
    .limit(1);
  return row ?? null;
}

/** Saved source packets are never overwritten: a new one is a new row. */
export async function savePacket(userId: string, packet: SourcePacket) {
  const id = randomUUID();
  const inserted = await db()
    .insert(labSourcePackets)
    .values({
      id,
      userId,
      topicId: packet.topicId,
      packet,
      refreshAfter: packet.refreshAfter,
      generatedAt: new Date(packet.generatedAt),
    })
    .onConflictDoNothing()
    .returning({ id: labSourcePackets.id });
  return inserted[0]?.id ?? null;
}

/**
 * Researches the topic again only when its newest packet is past its refresh date. For a proven topic, the Researcher
 * also compares against the old packet; changed facts put the topic into Practice through a radar re-check item.
 */
export async function freshPacket(userId: string, topicId: string) {
  const existing = await latestPacket(userId, topicId);
  if (existing && existing.refreshAfter >= ownerDay()) return existing;
  await assertBudget(userId);
  const proven = existing ? (await getProgress(userId, topicId)).state === "PROVEN" : false;
  const previousClaims = proven && existing ? existing.packet.claims.map((claim) => claim.statement) : [];
  const packet = await researchTopic(researchTargetFor(requireTopic(topicId)), previousClaims);
  if (!isPacketUsable(packet)) throw new LabInputError("No usable official sources found. Try again later", 502);
  await savePacket(userId, packet);
  if (proven && packet.changedSinceLast?.length) await flagRecheck(userId, topicId, packet);
  return (await latestPacket(userId, topicId))!;
}

/** A proven topic whose facts changed gets a re-check item. Its state never changes; it comes back in Practice. */
export async function flagRecheck(userId: string, topicId: string, packet: SourcePacket) {
  const topic = requireTopic(topicId);
  const chapter = topicMap.chapters.find((item) => item.id === topic.chapter)!;
  await db()
    .insert(labRadarItems)
    .values({
      id: randomUUID(),
      userId,
      week: isoWeek(new Date()),
      area: chapter.area,
      tag: "recheck",
      topicId,
      title: `Re-check ${topic.title}`,
      reason: packet.changedSinceLast!.slice(0, 2).join(" "),
      sourceUrl: packet.sources[0]?.url ?? null,
    });
}
