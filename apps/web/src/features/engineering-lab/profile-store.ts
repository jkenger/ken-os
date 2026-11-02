import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { labProfile } from "@/lib/db/schema";

// The owner's Engineering profile row. Spec: docs/architecture/engineering-claude-first.md, section 3. Only its target
// role is still read: it shapes the default roadmap until Claude plans one.

export async function getProfileRow(userId: string) {
  const [row] = await db().select().from(labProfile).where(eq(labProfile.userId, userId)).limit(1);
  return row ?? null;
}
