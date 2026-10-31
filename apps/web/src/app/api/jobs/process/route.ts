import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { extractPosting } from "@ken-os/agents";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { LINKEDIN_HEADERS } from "@/features/jobs/scrapers/linkedin";
import { INDEED_HEADERS } from "@/features/jobs/scrapers/indeed";
import { processPostings } from "@/features/jobs/process";
import { readFullPosting } from "@/features/jobs/read-posting";
import { getPendingPostings, saveExtractedFields } from "@/features/jobs/store";

export const runtime = "nodejs";

// Polled on its own cadence by an outside scheduler, separate from the scrape routes (plans/jobs-score.md,
// "Architecture decision"): a full-page fetch plus two AI calls per posting is too slow to run inline inside a
// scrape request. The secret goes in a header, not a query string, so it never lands in logs or analytics.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!expectedSecret || !ownerEmail) {
    console.error("jobs process: missing check-secret or owner-account environment variables");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail)).limit(1);
  if (!owner) {
    console.error("jobs process: no user row for the configured owner account");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-jobs-check-secret") ?? "";

  const result = await processPostings({
    secret,
    expectedSecret,
    getPending: (limit) => getPendingPostings(owner.id, limit),
    readFullPosting: (sources) =>
      readFullPosting(sources, async (source, url) => {
        const headers = source === "linkedin" ? LINKEDIN_HEADERS : INDEED_HEADERS;
        const response = await fetch(url, { headers });
        return { status: response.status, html: await response.text() };
      }),
    extract: (input) => extractPosting(input),
    saveExtracted: (postingId, fields) => saveExtractedFields(postingId, fields),
  });

  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 401 });
  return NextResponse.json({ ok: true, reason: result.reason, processed: result.processed });
}
