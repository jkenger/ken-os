import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { users } from "@/lib/db/schema";
import { checkFreehire } from "@/features/jobs/check-freehire";
import { getPreferences } from "@/features/jobs/preferences-store";
import { deriveRoles } from "@/features/jobs/roles";
import { getProfile } from "@/features/profile/store";
import { freehireDetailUrl, parseFreehireDetail } from "@/features/jobs/scrapers/freehire";
import { savePostings } from "@/features/jobs/store";

export const runtime = "nodejs";

// Polled every minute by an outside scheduler (docs/product/job-finder.md, "Getting postings in";
// plans/jobs-freehire-source.md). The secret goes in a header, not a query string, so it never lands in logs or
// analytics. Unlike the LinkedIn/Indeed routes this replaces, there's no block state to check or record -- see
// `check-freehire.ts`.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!expectedSecret || !ownerEmail) {
    console.error("jobs check freehire: missing check-secret or owner-account environment variables");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (!owner) {
    console.error("jobs check freehire: no user row for the configured owner account");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const [profile, preferences] = await Promise.all([getProfile(owner.id), getPreferences(owner.id)]);
  const secret = request.headers.get("x-jobs-check-secret") ?? "";

  const result = await checkFreehire({
    secret,
    expectedSecret,
    keywords: preferences.roles.length > 0 ? preferences.roles : deriveRoles(profile.details),
    fetchSearch: async (url) => {
      const response = await fetch(url);
      return { status: response.status, text: await response.text() };
    },
    savePostings: (postings) =>
      savePostings(owner.id, postings, async (sourceId) => {
        const slug = sourceId.replace(/^fh-/, "");
        const response = await fetch(freehireDetailUrl(slug));
        if (response.status !== 200) return null;
        return parseFreehireDetail(await response.text());
      }),
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 401 });
  return NextResponse.json({ ok: true, reason: result.reason, found: result.found });
}
