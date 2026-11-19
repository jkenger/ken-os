import type { ScraperSourceState } from "./scraper-state";
import { timeAgo } from "./time-ago";

export type ScraperStatusView =
  { kind: "never" } | { kind: "running"; agoLabel: string | null } | { kind: "blocked"; untilLabel: string };

/** One of three states for a scraped source's own Overview row (docs/mockups/jobs-scraper-status.md) -- Never
 *  (no row at all), Blocked (an active, unexpired backoff), or Running otherwise. A `blockedUntil` already in the
 *  past is running, not stuck blocked forever -- the same "expired block doesn't block" rule
 *  `scraper-contract.ts`'s `getBlockedUntil` already applies, reapplied here since this reads every row raw. */
export function describeScraperState(state: ScraperSourceState | undefined, now: Date = new Date()): ScraperStatusView {
  if (!state) return { kind: "never" };

  if (state.blocked && state.blockedUntil && state.blockedUntil.getTime() > now.getTime()) {
    return { kind: "blocked", untilLabel: state.blockedUntil.toLocaleString() };
  }

  return { kind: "running", agoLabel: state.lastRunAt ? timeAgo(state.lastRunAt, now) : null };
}
