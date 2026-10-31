import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { extractPosting, scoreJobPosting } from "@ken-os/agents";
import type { ProfileDetails } from "@ken-os/domain";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { getProfile } from "@/features/profile/store";
import { LINKEDIN_HEADERS } from "@/features/jobs/scrapers/linkedin";
import { INDEED_HEADERS } from "@/features/jobs/scrapers/indeed";
import { processPostings, scorePostings } from "@/features/jobs/process";
import { readFullPosting } from "@/features/jobs/read-posting";
import { getNeedingScore, getPendingPostings, saveExtractedFields, saveScore } from "@/features/jobs/store";

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

  const extractResult = await processPostings({
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
  if (!extractResult.ok) return NextResponse.json({ error: extractResult.reason }, { status: 401 });

  const profileState = await getProfile(owner.id);
  const profileVersion = profileState.savedAt ? new Date(profileState.savedAt) : null;

  const scoreResult = await scorePostings({
    secret,
    expectedSecret,
    getNeedingScore: (limit) => getNeedingScore(owner.id, profileVersion, limit),
    getProfileForScoring: async () => ({ profile: profileState.details, version: profileVersion }),
    score: (input) =>
      scoreJobPosting({
        profile: input.profile as ProfileDetails,
        title: input.title,
        company: input.company,
        text: input.text,
      }),
    saveScore: (postingId, fields) => saveScore(postingId, fields),
  });
  if (!scoreResult.ok) return NextResponse.json({ error: scoreResult.reason }, { status: 401 });

  return NextResponse.json({
    ok: true,
    reason: "ok",
    processed: extractResult.processed + scoreResult.processed,
  });
}
