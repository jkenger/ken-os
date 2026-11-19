import { NextResponse } from "next/server";
import { recordCheck } from "@/features/jobs/check-status-store";
import { listUsersWithPreferences } from "@/features/jobs/preferences-store";
import { scrapeLinkedInForUser } from "@/features/jobs/pipeline";
import { secretsMatch } from "@/features/jobs/secret";

export const runtime = "nodejs";

// Polled every minute by an outside scheduler, same as `check/freehire/route.ts` (plans/jobs-scraper-sources.md,
// Slice 1). `recordCheck` still stamps each account's own per-user "Last checked" fact even though the block
// state itself is global (`scraper-state.ts`) -- an account still deserves to see its own last-run outcome, and
// Slice 3 adds the global Running/Blocked fact on top of this.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  if (!expectedSecret) {
    console.error("jobs check linkedin: missing check-secret environment variable");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-jobs-check-secret") ?? "";
  if (!secretsMatch(secret, expectedSecret)) return NextResponse.json({ error: "bad secret" }, { status: 401 });

  const userIds = await listUsersWithPreferences();
  let found = 0;
  for (const userId of userIds) {
    try {
      const result = await scrapeLinkedInForUser(userId, secret, expectedSecret);
      await recordCheck(userId, result);
      found += result.found;
    } catch (error) {
      console.error(`jobs check linkedin: user ${userId} failed`, error instanceof Error ? error.message : error);
      await recordCheck(userId, { ok: false, reason: "A network or server error interrupted the check", found: 0 });
    }
  }

  return NextResponse.json({ ok: true, reason: "ok", found, users: userIds.length });
}
