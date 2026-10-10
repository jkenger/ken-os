import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { labProfile } from "@/lib/schema";

// The intake, target role and hours per week. Spec: docs/architecture/engineering-rebuild.md, sections 3 and 5.

export async function getProfileRow(userId: string) {
  const [row] = await db().select().from(labProfile).where(eq(labProfile.userId, userId)).limit(1);
  return row ?? null;
}

export async function upsertProfile(userId: string, values: Partial<Omit<typeof labProfile.$inferInsert, "userId">>) {
  await db().insert(labProfile).values({ userId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({ target: labProfile.userId, set: { ...values, updatedAt: new Date() } });
}

/** The Ken OS home's one-line Engineering card. */
export async function labSummary(_userId: string): Promise<{ headline: string; detail: string } | null> {
  return { headline: "Engineering", detail: "Open" };
}
