import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { scanRadar } from "@ken-os/agents";
import { isoWeek, radarDomains, type Area } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labProfile, labRadarItems } from "@/lib/schema";
import { careers } from "./curriculum";
import { LabInputError } from "./errors";
import { getProfileRow } from "./profile-store";

// The weekly radar. Design: docs/architecture/engineering-lab-profile.md, section 7. It has its own allowance, one
// scan per week, instead of the daily AI limit.

export async function runRadar(userId: string) {
  const profile = await getProfileRow(userId);
  const role = careers.roles.find((item) => item.id === profile?.direction);
  if (!role) throw new LabInputError("Pick a direction first; the radar watches your direction's areas.", 409);
  const week = isoWeek(new Date());
  if (profile?.radarCheckedWeek === week) throw new LabInputError("This week's radar is already done. The next one opens on Monday.", 409);
  // Claim the week before the slow AI call, so a double click can't run it twice.
  const claimed = await db().update(labProfile).set({ radarCheckedWeek: week, updatedAt: new Date() })
    .where(and(eq(labProfile.userId, userId), profile?.radarCheckedWeek ? eq(labProfile.radarCheckedWeek, profile.radarCheckedWeek) : undefined))
    .returning({ userId: labProfile.userId });
  if (!claimed.length) throw new LabInputError("This week's radar is already running.", 409);

  const areas = (Object.keys(role.targets) as Area[]).map((id) => ({ id, title: careers.areas.find((area) => area.id === id)!.title }));
  const seen = await db().select({ title: labRadarItems.title }).from(labRadarItems).where(eq(labRadarItems.userId, userId)).orderBy(desc(labRadarItems.createdAt)).limit(40);
  try {
    const { items, rejected } = await scanRadar({
      roleTitle: role.title, areas, allowedDomains: radarDomains(areas.map((area) => area.id)), seen: seen.map((row) => row.title), today: new Date().toISOString().slice(0, 10),
    });
    if (items.length) {
      await db().insert(labRadarItems).values(items.map((item) => ({ id: randomUUID(), userId, week, area: item.area, tag: item.tag, title: item.title, reason: item.reason, sourceUrl: item.sourceUrl })));
    }
    return { added: items.length, rejected };
  } catch (error) {
    // A failed scan gives the week back so it can be tried again.
    await db().update(labProfile).set({ radarCheckedWeek: profile?.radarCheckedWeek ?? null }).where(eq(labProfile.userId, userId));
    throw error;
  }
}
