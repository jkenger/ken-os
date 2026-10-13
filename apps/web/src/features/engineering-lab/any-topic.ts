import { and, eq } from "drizzle-orm";
import type { Topic } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labCustomTopics } from "@/lib/schema";
import { findTopic, placeOf } from "./curriculum";
import { LabInputError } from "./errors";

// A topic on the owner's roadmap: one from the reviewed topic map, or one Claude added (`custom.*`). Spec:
// docs/architecture/engineering-claude-first.md, section 3. The Claude-first code reads topics through here; the old
// screens stay on the map only until slice 4 removes them.

export interface AnyTopic {
  id: string;
  title: string;
  /** Added by Claude, not from the reviewed map. */
  custom: boolean;
  area: string;
  chapter: string;
  /** For a map topic: what it repairs, in one line. Null for Claude's topics. */
  gap: string | null;
  /** What the owner should be able to explain: the approved points, or Claude's 3 to 5 lines. */
  points: string[];
  /** The map topic, for its repo exercise. Null for Claude's topics, which have only Claude's exercises. */
  mapTopic: Topic | null;
}

export const isCustomTopicId = (topicId: string) => topicId.startsWith("custom.");

export function fromMap(topic: Topic): AnyTopic {
  return {
    id: topic.id,
    title: topic.title,
    custom: false,
    ...placeOf(topic),
    gap: topic.gap,
    points: topic.points,
    mapTopic: topic,
  };
}

/** Every topic Claude added for this owner. */
export async function customTopics(userId: string) {
  return db().select().from(labCustomTopics).where(eq(labCustomTopics.userId, userId));
}

/** The topic, or a 404 the owner or Claude can read. `place` names the chapter a custom topic sits in, if known. */
export async function requireAnyTopic(userId: string, topicId: string, place?: { chapter: string }): Promise<AnyTopic> {
  const mapped = findTopic(topicId);
  if (mapped) return fromMap(mapped);
  if (isCustomTopicId(topicId)) {
    const [row] = await db()
      .select()
      .from(labCustomTopics)
      .where(and(eq(labCustomTopics.userId, userId), eq(labCustomTopics.id, topicId)))
      .limit(1);
    if (row) {
      return {
        id: row.id,
        title: row.title,
        custom: true,
        area: "Added by Claude",
        chapter: place?.chapter ?? "Added by Claude",
        gap: null,
        points: row.lines,
        mapTopic: null,
      };
    }
  }
  throw new LabInputError("Unknown topic.", 404);
}
