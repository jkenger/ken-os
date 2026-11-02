import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { ownerDayStart } from "@/lib/day";
import { labRoadmaps, labTopicMaterial, labTopicPlans } from "@/lib/db/schema";
import { requireAnyTopic, topicMaterial } from "./any-topic";
import { LabInputError } from "./errors";
import {
  brokenLinks,
  mergePlans,
  type TopicMaterialInput,
  type TopicPlan,
  type TopicPlanInput,
} from "./topic-material";

// Where Claude's material is kept (docs/architecture/roadmap-ui.md). Claude is the only writer; the owner reads it in
// the topic panel and corrects it by asking Claude. Rules live in topic-material.ts.

/** Every topic's plan on a roadmap, by topic id. Topics without one are left out. */
export async function getPlans(roadmapId: string | null): Promise<Record<string, TopicPlan>> {
  if (!roadmapId) return {};
  const rows = await db().select().from(labTopicPlans).where(eq(labTopicPlans.roadmapId, roadmapId));
  return Object.fromEntries(
    rows.map((row) => [
      row.topicId,
      { prerequisites: row.prerequisites, related: row.related, minutes: row.minutes, difficulty: row.difficulty },
    ]),
  );
}

/**
 * Saves the plans Claude sends for topics on one of the owner's active roadmaps. Fields left out keep their saved
 * value, so the same call plans a roadmap and corrects one topic later.
 */
export async function saveTopicPlans(userId: string, roadmapId: string, topics: TopicPlanInput[]) {
  const [roadmap] = await db()
    .select({ chapters: labRoadmaps.chapters, status: labRoadmaps.status })
    .from(labRoadmaps)
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.id, roadmapId)))
    .limit(1);
  if (!roadmap) throw new LabInputError(`Unknown roadmap "${roadmapId}"`);
  if (roadmap.status !== "active") throw new LabInputError("That roadmap is archived. Plan an active one");
  const topicIds = roadmap.chapters.flatMap((chapter) => chapter.topicIds);
  let merged: Record<string, TopicPlan>;
  try {
    merged = mergePlans(topicIds, await getPlans(roadmapId), topics);
  } catch (error) {
    throw new LabInputError(error instanceof Error ? error.message : "Check the plan");
  }
  const changed = [...new Set(topics.map((topic) => topic.topicId))];
  await db()
    .insert(labTopicPlans)
    .values(changed.map((topicId) => ({ roadmapId, topicId, ...merged[topicId], updatedAt: new Date() })))
    .onConflictDoUpdate({
      target: [labTopicPlans.roadmapId, labTopicPlans.topicId],
      set: {
        prerequisites: sql`excluded.prerequisites`,
        related: sql`excluded.related`,
        minutes: sql`excluded.minutes`,
        difficulty: sql`excluded.difficulty`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
  return { topics: changed.length };
}

/** Claude's material for a topic, or null before Claude writes it. Read in any-topic.ts, which applies it to the topic. */
export const getMaterial = topicMaterial;

/** Saves a topic's material whole, replacing the last one. Refused when a resource link doesn't load. */
export async function saveTopicMaterial(
  userId: string,
  { topicId, ...material }: TopicMaterialInput,
  check: (urls: string[]) => Promise<string[]> = brokenLinks,
) {
  await requireAnyTopic(userId, topicId);
  const broken = await check(material.resources.map((resource) => resource.url));
  if (broken.length) throw new LabInputError(`These links don't load: ${broken.join(", ")}. Use real pages`);
  await db()
    .insert(labTopicMaterial)
    .values({ userId, topicId, ...material, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [labTopicMaterial.userId, labTopicMaterial.topicId],
      set: { ...material, updatedAt: new Date() },
    });
  return { topicId };
}

/** Material and plan saves today, for Claude's daily write limit: a material row, or a roadmap whose plans changed. */
export async function materialWritesToday(userId: string) {
  const since = ownerDayStart();
  const roadmapIds = db().select({ id: labRoadmaps.id }).from(labRoadmaps).where(eq(labRoadmaps.userId, userId));
  const [[material], [plans]] = await Promise.all([
    db()
      .select({ n: sql<number>`count(*)::int` })
      .from(labTopicMaterial)
      .where(and(eq(labTopicMaterial.userId, userId), gte(labTopicMaterial.updatedAt, since))),
    db()
      .select({ n: sql<number>`count(distinct ${labTopicPlans.roadmapId})::int` })
      .from(labTopicPlans)
      .where(and(inArray(labTopicPlans.roadmapId, roadmapIds), gte(labTopicPlans.updatedAt, since))),
  ]);
  return (material?.n ?? 0) + (plans?.n ?? 0);
}
