import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobScraperState } from "@/lib/schema";
import type { AlertSource } from "./known-senders";

const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

export type ScraperState = {
  source: AlertSource;
  lastRunAt: Date | null;
  lastResult: "ok" | "empty" | "blocked" | null;
  blockedUntil: Date | null;
};

export async function getScraperState(userId: string, source: AlertSource): Promise<ScraperState | null> {
  const [row] = await db()
    .select()
    .from(jobScraperState)
    .where(and(eq(jobScraperState.userId, userId), eq(jobScraperState.source, source)))
    .limit(1);
  return row ?? null;
}

export async function isBlocked(userId: string, source: AlertSource, now: Date = new Date()): Promise<boolean> {
  const state = await getScraperState(userId, source);
  return !!state?.blockedUntil && state.blockedUntil > now;
}

/** A 403 or 429 blocks a source for 24 hours (docs/product/job-finder.md, "Getting postings in"). */
export async function recordBlocked(userId: string, source: AlertSource, now: Date = new Date()): Promise<void> {
  const blockedUntil = new Date(now.getTime() + BLOCK_DURATION_MS);
  await db()
    .insert(jobScraperState)
    .values({ userId, source, lastRunAt: now, lastResult: "blocked", blockedUntil, updatedAt: now })
    .onConflictDoUpdate({
      target: [jobScraperState.userId, jobScraperState.source],
      set: { lastRunAt: now, lastResult: "blocked", blockedUntil, updatedAt: now },
    });
}

/** A run that wasn't blocked clears any earlier block, since the source is reachable again. */
export async function recordRun(
  userId: string,
  source: AlertSource,
  result: "ok" | "empty",
  now: Date = new Date(),
): Promise<void> {
  await db()
    .insert(jobScraperState)
    .values({ userId, source, lastRunAt: now, lastResult: result, blockedUntil: null, updatedAt: now })
    .onConflictDoUpdate({
      target: [jobScraperState.userId, jobScraperState.source],
      set: { lastRunAt: now, lastResult: result, blockedUntil: null, updatedAt: now },
    });
}
