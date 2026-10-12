import { randomUUID } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import { scanRadar } from "@ken-os/agents";
import { isoWeek, radarDomains, type Area } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labProfile, labRadarItems } from "@/lib/schema";
import { careers, findTopic } from "./curriculum";
import { LabInputError } from "./errors";
import { getProfileRow } from "./profile-store";

// The weekly radar: official sources, at most 5 items a week, never graded. It has its own allowance, one scan per
// week, instead of the daily AI limit. A changed source for a proven topic adds a re-check item and puts the topic into
// Practice; it never changes the topic's state.

export async function runRadar(userId: string) {
  const profile = await getProfileRow(userId);
  const role = careers.roles.find((item) => item.id === profile?.direction);
  if (!role) throw new LabInputError("Pick a direction first; the radar watches your direction's areas.", 409);
  const week = isoWeek(new Date());
  if (profile?.radarCheckedWeek === week)
    throw new LabInputError("This week's radar is already done. The next one opens on Monday.", 409);
  // Claim the week before the slow AI call, so a double click can't run it twice.
  const claimed = await db()
    .update(labProfile)
    .set({ radarCheckedWeek: week, updatedAt: new Date() })
    .where(
      and(
        eq(labProfile.userId, userId),
        profile?.radarCheckedWeek ? eq(labProfile.radarCheckedWeek, profile.radarCheckedWeek) : undefined,
      ),
    )
    .returning({ userId: labProfile.userId });
  if (!claimed.length) throw new LabInputError("This week's radar is already running.", 409);

  const areas = (Object.keys(role.targets) as Area[]).map((id) => ({
    id,
    title: careers.areas.find((area) => area.id === id)!.title,
  }));
  const seen = await db()
    .select({ title: labRadarItems.title })
    .from(labRadarItems)
    .where(eq(labRadarItems.userId, userId))
    .orderBy(desc(labRadarItems.createdAt))
    .limit(40);
  try {
    const { items, rejected } = await scanRadar({
      roleTitle: role.title,
      areas,
      allowedDomains: radarDomains(areas.map((area) => area.id)),
      seen: seen.map((row) => row.title),
      today: new Date().toISOString().slice(0, 10),
    });
    if (items.length) {
      await db()
        .insert(labRadarItems)
        .values(
          items.map((item) => ({
            id: randomUUID(),
            userId,
            week,
            area: item.area,
            tag: item.tag,
            title: item.title,
            reason: item.reason,
            sourceUrl: item.sourceUrl,
          })),
        );
    }
    return { added: items.length, rejected };
  } catch (error) {
    // A failed scan gives the week back so it can be tried again.
    await db()
      .update(labProfile)
      .set({ radarCheckedWeek: profile?.radarCheckedWeek ?? null })
      .where(eq(labProfile.userId, userId));
    throw error;
  }
}

export interface RadarView {
  week: string;
  checked: boolean;
  /** The target role, or null before one is chosen; the radar watches its areas. */
  direction: string | null;
  items: {
    id: string;
    tag: string;
    title: string;
    reason: string;
    sourceUrl: string | null;
    topicId: string | null;
    area: string;
  }[];
}

/** This week's items and every open re-check, newest first. */
export async function getRadarView(userId: string): Promise<RadarView> {
  const week = isoWeek(new Date());
  const [profile, rows] = await Promise.all([
    getProfileRow(userId),
    db()
      .select()
      .from(labRadarItems)
      .where(and(eq(labRadarItems.userId, userId), isNull(labRadarItems.dismissedAt)))
      .orderBy(desc(labRadarItems.createdAt))
      .limit(20),
  ]);
  return {
    week,
    checked: profile?.radarCheckedWeek === week,
    direction: profile?.direction ?? null,
    items: rows
      .filter((row) => row.week === week || row.tag === "recheck")
      .map((row) => ({
        id: row.id,
        tag: row.tag,
        title:
          row.tag === "recheck" && row.topicId ? `Re-check ${findTopic(row.topicId)?.title ?? row.topicId}` : row.title,
        reason: row.reason,
        sourceUrl: row.sourceUrl,
        topicId: row.topicId,
        area: row.area,
      })),
  };
}

/** Proven topics with an open re-check item: they come back in Practice. */
export async function recheckTopics(userId: string): Promise<string[]> {
  const rows = await db()
    .select({ topicId: labRadarItems.topicId })
    .from(labRadarItems)
    .where(and(eq(labRadarItems.userId, userId), eq(labRadarItems.tag, "recheck"), isNull(labRadarItems.dismissedAt)));
  return [...new Set(rows.map((row) => row.topicId).filter((id): id is string => Boolean(id)))];
}

export async function dismissRadarItem(userId: string, id: string) {
  const updated = await db()
    .update(labRadarItems)
    .set({ dismissedAt: new Date() })
    .where(and(eq(labRadarItems.id, id), eq(labRadarItems.userId, userId)))
    .returning({ id: labRadarItems.id });
  if (!updated.length) throw new LabInputError("Radar item not found. Reload the page", 404);
  return { dismissed: true };
}
