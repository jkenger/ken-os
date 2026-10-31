import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { checkIndeed } from "@/features/jobs/check-indeed";
import { deriveRoles } from "@/features/jobs/roles";
import { isBlocked, recordBlocked, recordRun } from "@/features/jobs/scraper-state";
import { INDEED_HEADERS } from "@/features/jobs/scrapers/indeed";
import { getProfile } from "@/features/profile/store";
import { savePostings } from "@/features/jobs/store";

export const runtime = "nodejs";

// Polled every minute by an outside scheduler (docs/product/job-finder.md, "Getting postings in"). The secret goes
// in a header, not a query string, so it never lands in logs or analytics.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!expectedSecret || !ownerEmail) {
    console.error("jobs check indeed: missing check-secret or owner-account environment variables");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (!owner) {
    console.error("jobs check indeed: no user row for the configured owner account");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const profile = await getProfile(owner.id);
  const secret = request.headers.get("x-jobs-check-secret") ?? "";

  const result = await checkIndeed({
    secret,
    expectedSecret,
    keywords: deriveRoles(profile.details),
    isBlocked: () => isBlocked(owner.id, "indeed"),
    fetchSearch: async (body) => {
      const response = await fetch("https://apis.indeed.com/graphql", {
        method: "POST",
        headers: INDEED_HEADERS,
        body,
      });
      return { status: response.status, json: await response.text() };
    },
    savePostings: (postings) => savePostings(owner.id, postings),
    recordBlocked: () => recordBlocked(owner.id, "indeed"),
    recordRun: (outcome) => recordRun(owner.id, "indeed", outcome),
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 401 });
  return NextResponse.json({ ok: true, reason: result.reason });
}
