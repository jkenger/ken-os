import { timeAgo } from "./time-ago";

export type CheckStatus = {
  firstCheckedAt: Date;
  checkedAt: Date;
  checkCount: number;
  ok: boolean;
  reason: string;
  found: number;
  lastOkAt: Date | null;
};

/** The scheduler is expected every minute (apps/web/src/features/jobs/README.md, "Production setup"); a
 *  successful check more than five minutes stale means it's stopped calling, not that it's merely a little
 *  behind. */
const STALE_AFTER_MS = 5 * 60 * 1000;

export type CheckStatusView =
  | { kind: "never" }
  | { kind: "working"; agoLabel: string; found: number; checkCount: number; sinceLabel: string }
  | { kind: "failing"; agoLabel: string; reason: string; lastGoodAgoLabel: string | null }
  | { kind: "late"; agoLabel: string };

function monthDay(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** One of four states for the "Last checked" fact (docs/mockups/jobs-redesign-canvas/Last-checked.dc.html) --
 *  Never (no row at all), Working (a recent success), Failing (the latest call failed, regardless of how long
 *  ago -- a known failure is more actionable than "it's been a while"), or Late (the latest call succeeded but
 *  nothing newer has arrived, so the scheduler may have stopped without ever actually failing). */
export function describeCheckStatus(status: CheckStatus | null, now: Date = new Date()): CheckStatusView {
  if (!status) return { kind: "never" };

  const agoLabel = timeAgo(status.checkedAt, now);

  if (!status.ok) {
    return {
      kind: "failing",
      agoLabel,
      reason: status.reason,
      lastGoodAgoLabel: status.lastOkAt ? timeAgo(status.lastOkAt, now) : null,
    };
  }

  const stale = now.getTime() - status.checkedAt.getTime() > STALE_AFTER_MS;
  if (stale) return { kind: "late", agoLabel };

  return {
    kind: "working",
    agoLabel,
    found: status.found,
    checkCount: status.checkCount,
    sinceLabel: monthDay(status.firstCheckedAt),
  };
}
