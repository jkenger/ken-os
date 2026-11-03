import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { jobCheckStatus } from "@/lib/db/schema";
import type { CheckStatus } from "./format-check-status";

/** `null` means the outside scheduler has never called `/api/jobs/check/freehire` for this owner -- distinct
 *  from a recorded failure, which still has a `checkedAt`. */
export async function getCheckStatus(userId: string): Promise<CheckStatus | null> {
  const [row] = await db().select().from(jobCheckStatus).where(eq(jobCheckStatus.userId, userId)).limit(1);
  if (!row) return null;
  return {
    firstCheckedAt: row.firstCheckedAt,
    checkedAt: row.checkedAt,
    checkCount: row.checkCount,
    ok: row.ok,
    reason: row.reason,
    found: row.found,
    lastOkAt: row.lastOkAt,
  };
}

/** Called by `check/freehire/route.ts` on every call it receives, including a bad secret -- a wrong or missing
 *  secret is still a fact worth showing on the Overview, not just the ones that got far enough to search.
 *  `lastOkAt` only moves forward on a success, so a run of failures never erases when the pipeline last
 *  actually worked (docs/mockups/jobs-redesign-canvas/Last-checked.dc.html, "Failing"). */
export async function recordCheck(
  userId: string,
  result: { ok: boolean; reason: string; found: number },
): Promise<void> {
  const checkedAt = new Date();
  await db()
    .insert(jobCheckStatus)
    .values({
      userId,
      firstCheckedAt: checkedAt,
      checkedAt,
      checkCount: 1,
      ok: result.ok,
      reason: result.reason,
      found: result.found,
      lastOkAt: result.ok ? checkedAt : null,
    })
    .onConflictDoUpdate({
      target: jobCheckStatus.userId,
      set: {
        checkedAt,
        checkCount: sql`${jobCheckStatus.checkCount} + 1`,
        ok: result.ok,
        reason: result.reason,
        found: result.found,
        lastOkAt: result.ok ? checkedAt : sql`${jobCheckStatus.lastOkAt}`,
      },
    });
}
