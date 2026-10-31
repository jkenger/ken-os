import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { checkLinkedIn } from "@/features/jobs/check-linkedin";
import { deriveRoles } from "@/features/jobs/roles";
import { isBlocked, recordBlocked, recordRun } from "@/features/jobs/scraper-state";
import { getProfile } from "@/features/profile/store";
import { savePostings } from "@/features/jobs/store";

export const runtime = "nodejs";

// Polled every minute by an outside scheduler (docs/product/job-finder.md, "Getting postings in"). The secret goes
// in a header, not a query string, so it never lands in logs or analytics.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!expectedSecret || !ownerEmail) {
    console.error("jobs check linkedin: missing check-secret or owner-account environment variables");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (!owner) {
    console.error("jobs check linkedin: no user row for the configured owner account");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const profile = await getProfile(owner.id);
  const secret = request.headers.get("x-jobs-check-secret") ?? "";

  const result = await checkLinkedIn({
    secret,
    expectedSecret,
    keywords: deriveRoles(profile.details),
    isBlocked: () => isBlocked(owner.id, "linkedin"),
    fetchSearch: async (url) => {
      const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; Loots/1.0)" } });
      return { status: response.status, html: await response.text() };
    },
    savePostings: (postings) => savePostings(owner.id, postings),
    recordBlocked: () => recordBlocked(owner.id, "linkedin"),
    recordRun: (outcome) => recordRun(owner.id, "linkedin", outcome),
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 401 });
  return NextResponse.json({ ok: true, reason: result.reason });
}
