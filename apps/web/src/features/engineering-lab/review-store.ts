import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { ownerDayStart } from "@/lib/day";
import { labNotes, labReviews, labTopicEvents } from "@/lib/db/schema";
import { customTopics, requireAnyTopic } from "./any-topic";
import { findTopic } from "./curriculum";
import { LabInputError } from "./errors";
import { checkSheet, searchReviews, type ReviewSheet, type SearchHit } from "./review-sheet";

// Review sheets (docs/architecture/engineering-claude-first.md, section 9h). Claude writes a topic's sheet with
// save_review; each save is a new version, the latest shows, and old versions stay. The Review tab adds the owner's
// passing code and their own explanation from the Learned evidence, read from the topic's events, never copied.

export interface ReviewVersion {
  version: number;
  savedAt: string;
}

export interface ReviewView {
  topicId: string;
  /** The topic's points, p1 first, so the sheet can show what each one is about. */
  points: string[];
  /** The version shown: the latest, unless an older one was asked for. Null before Claude saves one. */
  sheet: (ReviewVersion & { sheet: ReviewSheet }) | null;
  /** Every saved version, newest first. */
  versions: ReviewVersion[];
  /** The owner's code from their latest passing run, if any. */
  passingCode: { code: string; at: string } | null;
  /** The owner's own explanation from the latest Learned report, if any. */
  explanation: { text: string; at: string } | null;
}

/** Saves a new version of the topic's sheet. It must cover each of the topic's points once. */
export async function saveReview(userId: string, topicId: string, input: ReviewSheet) {
  const topic = await requireAnyTopic(userId, topicId);
  let sheet: ReviewSheet;
  try {
    sheet = checkSheet(topic.points.length, input);
  } catch (error) {
    throw new LabInputError(error instanceof Error ? error.message : "Check the sheet's points");
  }
  return db().transaction(async (tx) => {
    const [latest] = await tx
      .select({ version: sql<number>`coalesce(max(${labReviews.version}), 0)::int` })
      .from(labReviews)
      .where(and(eq(labReviews.userId, userId), eq(labReviews.topicId, topicId)));
    const version = (latest?.version ?? 0) + 1;
    await tx.insert(labReviews).values({ id: randomUUID(), userId, topicId, version, sheet });
    return { version };
  });
}

async function versionsOf(userId: string, topicId: string): Promise<ReviewVersion[]> {
  const rows = await db()
    .select({ version: labReviews.version, createdAt: labReviews.createdAt })
    .from(labReviews)
    .where(and(eq(labReviews.userId, userId), eq(labReviews.topicId, topicId)))
    .orderBy(desc(labReviews.version));
  return rows.map((row) => ({ version: row.version, savedAt: row.createdAt.toISOString() }));
}

/** One version of the topic's sheet, the latest by default; null when there is none. */
export async function getReviewSheet(userId: string, topicId: string, version?: number) {
  const [row] = await db()
    .select()
    .from(labReviews)
    .where(
      and(
        eq(labReviews.userId, userId),
        eq(labReviews.topicId, topicId),
        version ? eq(labReviews.version, version) : undefined,
      ),
    )
    .orderBy(desc(labReviews.version))
    .limit(1);
  return row ? { version: row.version, savedAt: row.createdAt.toISOString(), sheet: row.sheet } : null;
}

/** What the Review tab shows. */
export async function getReview(userId: string, topicId: string, version?: number): Promise<ReviewView> {
  const topic = await requireAnyTopic(userId, topicId);
  const ofTopic = and(eq(labTopicEvents.userId, userId), eq(labTopicEvents.topicId, topicId));
  const [sheet, versions, [run], [learned]] = await Promise.all([
    getReviewSheet(userId, topicId, version),
    versionsOf(userId, topicId),
    db()
      .select({ code: labTopicEvents.code, createdAt: labTopicEvents.createdAt })
      .from(labTopicEvents)
      .where(
        and(
          ofTopic,
          eq(labTopicEvents.kind, "exercise_run"),
          eq(labTopicEvents.passed, true),
          isNotNull(labTopicEvents.code),
        ),
      )
      .orderBy(desc(labTopicEvents.createdAt))
      .limit(1),
    db()
      .select({ evidence: labTopicEvents.evidence, createdAt: labTopicEvents.createdAt })
      .from(labTopicEvents)
      .where(and(ofTopic, eq(labTopicEvents.kind, "report"), isNotNull(labTopicEvents.evidence)))
      .orderBy(desc(labTopicEvents.createdAt))
      .limit(1),
  ]);
  if (version && !sheet) throw new LabInputError(`No version ${version}`, 404);
  return {
    topicId,
    points: topic.points,
    sheet,
    versions,
    passingCode: run?.code ? { code: run.code, at: run.createdAt.toISOString() } : null,
    explanation: learned?.evidence ? { text: learned.evidence, at: learned.createdAt.toISOString() } : null,
  };
}

/** Finds a term across the latest sheet of every topic and every note. */
export async function searchAllReviews(userId: string, query: string): Promise<SearchHit[]> {
  const [sheets, notes, custom] = await Promise.all([
    db()
      .selectDistinctOn([labReviews.topicId], { topicId: labReviews.topicId, sheet: labReviews.sheet })
      .from(labReviews)
      .where(eq(labReviews.userId, userId))
      .orderBy(labReviews.topicId, desc(labReviews.version)),
    db()
      .select({ id: labNotes.id, topicId: labNotes.topicId, body: labNotes.body })
      .from(labNotes)
      .where(eq(labNotes.userId, userId))
      .orderBy(desc(labNotes.createdAt)),
    customTopics(userId),
  ]);
  const titleOf = (topicId: string) =>
    findTopic(topicId)?.title ?? custom.find((topic) => topic.id === topicId)?.title ?? null;
  const topicIds = [...new Set([...sheets.map((row) => row.topicId), ...notes.map((note) => note.topicId)])];
  const entries = topicIds.flatMap((topicId) => {
    const title = titleOf(topicId);
    if (!title) return [];
    return [
      {
        topicId,
        title,
        sheet: sheets.find((row) => row.topicId === topicId)?.sheet ?? null,
        notes: notes.filter((note) => note.topicId === topicId),
      },
    ];
  });
  return searchReviews(entries, query);
}

/** Sheets Claude saved today, for the daily write limit. */
export async function reviewsToday(userId: string) {
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(labReviews)
    .where(and(eq(labReviews.userId, userId), gte(labReviews.createdAt, ownerDayStart())));
  return row?.n ?? 0;
}
