import { NextResponse } from "next/server";
import { recordCheck } from "@/features/jobs/check-status-store";
import { listUsersWithPreferences } from "@/features/jobs/preferences-store";
import { scrapeFreehireForUser } from "@/features/jobs/pipeline";
import { secretsMatch } from "@/features/jobs/secret";

export const runtime = "nodejs";

// Polled every minute by an outside scheduler (docs/product/job-finder.md, "Getting postings in";
// plans/jobs-freehire-source.md). The secret goes in a header, not a query string, so it never lands in logs or
// analytics. Runs once per account that has saved Jobs settings (`listUsersWithPreferences`), each searching
// freehire for that account's own roles and saving into that account's own postings. A visited-but-never-saved
// Jobs page has no row there, so it's never polled. `recordCheck` stamps each account's own "Last checked" fact
// (`check-status-store.ts`) with its own result, success or failure, so one account's problem never shows up on
// another account's Overview; a bad shared secret is caught before any account is looked up at all, so there is
// nothing account-specific to record for it.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  if (!expectedSecret) {
    console.error("jobs check freehire: missing check-secret environment variable");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-jobs-check-secret") ?? "";
  if (!secretsMatch(secret, expectedSecret)) return NextResponse.json({ error: "bad secret" }, { status: 401 });

  const userIds = await listUsersWithPreferences();
  let found = 0;
  for (const userId of userIds) {
    try {
      const result = await scrapeFreehireForUser(userId, secret, expectedSecret);
      await recordCheck(userId, result);
      found += result.found;
    } catch (error) {
      console.error(`jobs check freehire: user ${userId} failed`, error instanceof Error ? error.message : error);
      await recordCheck(userId, { ok: false, reason: "A network or server error interrupted the check", found: 0 });
    }
  }

  return NextResponse.json({ ok: true, reason: "ok", found, users: userIds.length });
}
