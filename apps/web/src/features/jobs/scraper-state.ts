import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { jobScraperState } from "@/lib/db/schema";

/** `null` means this source has never run (never blocked, never completed a run) -- distinct from a row that
 *  exists but isn't currently blocked. Global per source, not per account: see `scraper-contract.ts`. */
export async function getBlockedUntil(source: string): Promise<Date | null> {
  const [row] = await db().select().from(jobScraperState).where(eq(jobScraperState.source, source)).limit(1);
  return row?.blocked ? (row.blockedUntil ?? null) : null;
}

export async function recordBlocked(source: string, until: Date): Promise<void> {
  await db()
    .insert(jobScraperState)
    .values({ source, blocked: true, blockedUntil: until })
    .onConflictDoUpdate({ target: jobScraperState.source, set: { blocked: true, blockedUntil: until } });
}

/** Clears any previous block -- a run that got far enough to call this succeeded, so a stale `blockedUntil`
 *  from before shouldn't linger even though `getBlockedUntil` would already treat a past date as not-blocking. */
export async function recordRunning(source: string): Promise<void> {
  const now = new Date();
  await db()
    .insert(jobScraperState)
    .values({ source, blocked: false, blockedUntil: null, lastRunAt: now })
    .onConflictDoUpdate({
      target: jobScraperState.source,
      set: { blocked: false, blockedUntil: null, lastRunAt: now },
    });
}
