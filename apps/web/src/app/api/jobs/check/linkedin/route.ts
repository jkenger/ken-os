import { NextResponse } from "next/server";
import { listUsersWithPreferences } from "@/features/jobs/preferences-store";
import { scrapeLinkedInForUser } from "@/features/jobs/pipeline";
import { secretsMatch } from "@/features/jobs/secret";

export const runtime = "nodejs";

// Polled every few minutes by an outside scheduler, same as `check/freehire/route.ts`
// (plans/jobs-scraper-sources.md, Slice 1). Unlike freehire, this doesn't call `recordCheck` -- that table is one
// row per account, not per source, and freehire already owns it; this source's own Running/Blocked fact lives in
// `job_scraper_state` instead (`scraper-state.ts`, Slice 3's `getAllScraperStates`), written by `checkScraperSource`
// itself.
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
      found += result.found;
    } catch (error) {
      console.error(`jobs check linkedin: user ${userId} failed`, error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ ok: true, reason: "ok", found, users: userIds.length });
}
