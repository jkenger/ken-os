import { NextResponse } from "next/server";
import { recordCheck } from "@/features/jobs/check-status-store";
import { listUsersWithPreferences } from "@/features/jobs/preferences-store";
import { scrapeJobStreetForUser } from "@/features/jobs/pipeline";
import { secretsMatch } from "@/features/jobs/secret";

export const runtime = "nodejs";

// Polled every minute by an outside scheduler, same as `check/linkedin/route.ts` (plans/jobs-scraper-sources.md,
// Slice 4).
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  if (!expectedSecret) {
    console.error("jobs check jobstreet: missing check-secret environment variable");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-jobs-check-secret") ?? "";
  if (!secretsMatch(secret, expectedSecret)) return NextResponse.json({ error: "bad secret" }, { status: 401 });

  const userIds = await listUsersWithPreferences();
  let found = 0;
  for (const userId of userIds) {
    try {
      const result = await scrapeJobStreetForUser(userId, secret, expectedSecret);
      await recordCheck(userId, result);
      found += result.found;
    } catch (error) {
      console.error(`jobs check jobstreet: user ${userId} failed`, error instanceof Error ? error.message : error);
      await recordCheck(userId, { ok: false, reason: "A network or server error interrupted the check", found: 0 });
    }
  }

  return NextResponse.json({ ok: true, reason: "ok", found, users: userIds.length });
}
