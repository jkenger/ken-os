import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { computeProgress, emptyProgress, type TopicEvent, type TopicProgress } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labProgress, labTopicEvents } from "@/lib/schema";
import { findTopic } from "./curriculum";
import { LabInputError } from "./errors";

// Topic events and exercise progress. Spec: docs/architecture/engineering-claude-first.md, sections 2 and 7.
// lab_topic_events is the source of truth: statuses (status-store.ts) and exercise progress are rebuilt from it, and
// lab_progress only caches the exercise progress.

export { LabInputError };

type Database = ReturnType<typeof db>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export function requireTopic(topicId: string) {
  const topic = findTopic(topicId);
  if (!topic) throw new LabInputError("Unknown topic.", 404);
  return topic;
}

/**
 * A map topic, or a topic Claude added (`custom.*`). Events and progress accept both; callers that take a custom id
 * from outside check it exists first, with requireAnyTopic in any-topic.ts.
 */
function requireTopicId(topicId: string) {
  if (!topicId.startsWith("custom.")) requireTopic(topicId);
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

/** A topic's exercise progress: whether its exercise stands passed, and whether the solution was opened since. */
export async function getProgress(userId: string, topicId: string): Promise<TopicProgress> {
  requireTopicId(topicId);
  const rows = await db()
    .select(eventColumns)
    .from(labTopicEvents)
    .where(and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.topicId, topicId)));
  return computeProgress(topicId, rows.map(toEvent));
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

/** Saves one event and returns the topic's new exercise progress. */
export async function recordEvent(userId: string, event: EventInput, tx?: Transaction) {
  requireTopicId(event.topicId);
  const write = async (inner: Transaction) => {
    const id = randomUUID();
    await inner.insert(labTopicEvents).values({ ...event, id, userId });
    return { id, progress: await recompute(inner, userId, event.topicId) };
  };
  return tx ? write(tx) : db().transaction(write);
}
