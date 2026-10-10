import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { labRuns } from "@/lib/schema";

// The 5-question assessment. Spec: docs/architecture/engineering-rebuild.md, section 3 (Intake, Assessment, Results).

/** The assessment in progress, if any. While it is open, lessons and term lookup stay closed. */
export async function activeRun(userId: string) {
  const [run] = await db().select().from(labRuns).where(and(eq(labRuns.userId, userId), isNull(labRuns.completedAt))).limit(1);
  return run ?? null;
}
