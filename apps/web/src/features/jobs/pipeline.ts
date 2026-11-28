import { extractPosting, scoreJobPosting } from "@ken-os/agents";
import type { ProfileDetails } from "@ken-os/domain";
import { getProfile } from "@/features/profile/store";
import { sendEmail } from "@/platform/email/resend-client";
import { checkFreehire } from "./check-freehire";
import { sendDigestEmailIfDue } from "./digest-email";
import { getLastDigestSentAt, getPreferences, markDigestSent } from "./preferences-store";
import { processPostings, scorePostings } from "./process";
import { deriveRoles } from "./roles";
import { checkScraperSource } from "./scraper-contract";
import { getBlockedUntil, recordBlocked, recordRunning } from "./scraper-state";
import { freehireDetailUrl, parseFreehireDetail } from "./scrapers/freehire";
import {
  indeedSearchQuery,
  indeedSearchUrl,
  INDEED_API_URL,
  INDEED_HEADERS,
  parseIndeedSearch,
} from "./scrapers/indeed";
import {
  linkedInDetailUrl,
  linkedInSearchUrl,
  parseLinkedInDescription,
  parseLinkedInSearch,
} from "./scrapers/linkedin";
import {
  JOBSTREET_GRAPHQL_URL,
  jobStreetDetailsRequestBody,
  jobStreetSearchUrl,
  parseJobStreetDetails,
  parseJobStreetSearch,
} from "./scrapers/jobstreet";
import {
  claimPendingPostings,
  getDigestFilteredOutCounts,
  getDigestPostings,
  getNeedingScore,
  getPosting,
  getUserEmail,
  markInstantEmailSent,
  saveExtractedFields,
  saveScore,
  savePostings,
  unclaimPosting,
} from "./store";
import { sendStrongMatchEmailIfDue } from "./strong-match-email";

// One account's run of each pipeline stage (plans/jobs-score.md, "Architecture decision"): the scheduler's poll
// loops these over every account with saved Jobs settings, and the "Run pipeline" button calls them for just the
// signed-in account, so the two never disagree about what one account's run actually does.

/** The account's own roles, or a guess from its Profile when none are set. `getProfile` is a wasted query once
 *  roles exist (the common case after first setup) -- fetched lazily, not alongside preferences, since every
 *  scraper below polls this every few minutes and Profile data changes only when the owner edits it by hand. */
async function resolveKeywords(userId: string): Promise<string[]> {
  const preferences = await getPreferences(userId);
  if (preferences.roles.length > 0) return preferences.roles;
  const profile = await getProfile(userId);
  return deriveRoles(profile.details);
}

/** Searches freehire for this account's own roles and saves whatever's new into this account's own postings. */
export async function scrapeFreehireForUser(
  userId: string,
  secret: string,
  expectedSecret: string,
): Promise<{ ok: boolean; reason: string; found: number }> {
  return checkFreehire({
    secret,
    expectedSecret,
    keywords: await resolveKeywords(userId),
    fetchSearch: async (url) => {
      const response = await fetch(url);
      return { status: response.status, text: await response.text() };
    },
    savePostings: (postings) =>
      savePostings(userId, postings, async (sourceId) => {
        const slug = sourceId.replace(/^fh-/, "");
        const response = await fetch(freehireDetailUrl(slug));
        if (response.status !== 200) return null;
        return parseFreehireDetail(await response.text());
      }),
  });
}

/** Searches LinkedIn's guest endpoint for this account's own roles and saves whatever's new. Unlike freehire,
 *  LinkedIn actively tries to stop scraping, so this goes through `checkScraperSource`'s block/backoff gate
 *  (plans/jobs-scraper-sources.md, Slice 1) -- a 403/429 stops every account's LinkedIn search for 24 hours, not
 *  just this one. */
export async function scrapeLinkedInForUser(
  userId: string,
  secret: string,
  expectedSecret: string,
): Promise<{ ok: boolean; reason: string; found: number }> {
  return checkScraperSource({
    secret,
    expectedSecret,
    keywords: await resolveKeywords(userId),
    searchUrl: (keyword) => linkedInSearchUrl(keyword, 0),
    parse: parseLinkedInSearch,
    fetchSearch: async (url) => {
      const response = await fetch(url, { headers: { "User-Agent": LINKEDIN_USER_AGENT } });
      return { status: response.status, text: await response.text() };
    },
    isBlockedStatus: (status) => status === 403 || status === 429,
    savePostings: (postings) =>
      savePostings(userId, postings, async (sourceId) => {
        const id = sourceId.replace(/^li-/, "");
        const response = await fetch(linkedInDetailUrl(id), { headers: { "User-Agent": LINKEDIN_USER_AGENT } });
        if (response.status !== 200) return null;
        return parseLinkedInDescription(await response.text());
      }),
    getBlockedUntil: () => getBlockedUntil("linkedin"),
    recordBlocked: (until) => recordBlocked("linkedin", until),
    recordRunning: () => recordRunning("linkedin"),
  });
}

const LINKEDIN_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Searches SEEK's PH edition (JobStreet) for this account's own roles and saves whatever's new. Same
 *  block/backoff gate as LinkedIn (plans/jobs-scraper-sources.md, Slice 4) -- live-tested unproxied and
 *  unimpersonated this session (see `scrapers/jobstreet.ts`), so a plain `fetch` is enough. */
export async function scrapeJobStreetForUser(
  userId: string,
  secret: string,
  expectedSecret: string,
): Promise<{ ok: boolean; reason: string; found: number }> {
  return checkScraperSource({
    secret,
    expectedSecret,
    keywords: await resolveKeywords(userId),
    searchUrl: (keyword) => jobStreetSearchUrl(keyword, 1),
    parse: parseJobStreetSearch,
    fetchSearch: async (url) => {
      const response = await fetch(url, { headers: { "User-Agent": JOBSTREET_USER_AGENT } });
      return { status: response.status, text: await response.text() };
    },
    isBlockedStatus: (status) => status === 403 || status === 429,
    savePostings: (postings) =>
      savePostings(userId, postings, async (sourceId) => {
        const id = sourceId.replace(/^js-/, "");
        const response = await fetch(JOBSTREET_GRAPHQL_URL, {
          method: "POST",
          headers: { "User-Agent": JOBSTREET_USER_AGENT, "Content-Type": "application/json" },
          body: JSON.stringify(jobStreetDetailsRequestBody(id)),
        });
        if (response.status !== 200) return null;
        return parseJobStreetDetails(await response.text(), id);
      }),
    getBlockedUntil: () => getBlockedUntil("jobstreet"),
    recordBlocked: (until) => recordBlocked("jobstreet", until),
    recordRunning: () => recordRunning("jobstreet"),
  });
}

const JOBSTREET_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Searches Indeed's mobile-app GraphQL endpoint for this account's own roles and saves whatever's new. Same
 *  block/backoff gate as LinkedIn (plans/jobs-scraper-sources.md, Slice 2) -- `indeedSearchUrl`'s "URL" is never
 *  actually fetched as a GET, it just carries the keyword back out to the real POST (see `scrapers/indeed.ts`). */
export async function scrapeIndeedForUser(
  userId: string,
  secret: string,
  expectedSecret: string,
): Promise<{ ok: boolean; reason: string; found: number }> {
  return checkScraperSource({
    secret,
    expectedSecret,
    keywords: await resolveKeywords(userId),
    searchUrl: indeedSearchUrl,
    parse: parseIndeedSearch,
    fetchSearch: async (url) => {
      const keyword = new URL(url).searchParams.get("q") ?? "";
      const response = await fetch(INDEED_API_URL, {
        method: "POST",
        headers: INDEED_HEADERS,
        body: JSON.stringify({ query: indeedSearchQuery(keyword, null) }),
      });
      return { status: response.status, text: await response.text() };
    },
    isBlockedStatus: (status) => status === 403 || status === 429,
    savePostings: (postings) => savePostings(userId, postings),
    getBlockedUntil: () => getBlockedUntil("indeed"),
    recordBlocked: (until) => recordBlocked("indeed", until),
    recordRunning: () => recordRunning("indeed"),
  });
}

/** Extracts and scores this account's own pending postings against this account's own Profile. */
export async function processUserPostings(
  userId: string,
  secret: string,
  expectedSecret: string,
): Promise<{ extracted: number; scored: number }> {
  const extractResult = await processPostings({
    secret,
    expectedSecret,
    getPending: (limit) => claimPendingPostings(userId, limit),
    extract: (input) => extractPosting(input),
    saveExtracted: (postingId, fields) => saveExtractedFields(postingId, fields),
    unclaim: (postingId) => unclaimPosting(postingId),
  });

  const profileState = await getProfile(userId);
  const profileVersion = profileState.savedAt ? new Date(profileState.savedAt) : null;
  const preferences = await getPreferences(userId);

  const scoreResult = await scorePostings({
    secret,
    expectedSecret,
    getNeedingScore: (limit) => getNeedingScore(userId, profileVersion, limit),
    getProfileForScoring: async () => ({ profile: profileState.details, version: profileVersion }),
    score: (input) =>
      scoreJobPosting({
        profile: input.profile as ProfileDetails,
        title: input.title,
        company: input.company,
        text: input.text,
      }),
    saveScore: (postingId, fields) => saveScore(postingId, fields),
    // Strong match, right after a posting is scored (docs/architecture/jobs-email.md, "Trigger points"). Re-reads
    // the posting's fresh score and send state rather than trusting the score passed here, so it works the same
    // way whether this is the first score or a rescore.
    onScored: (postingId) =>
      sendStrongMatchEmailIfDue(userId, postingId, preferences.instantEmailThreshold, {
        getPosting,
        getUserEmail,
        sendEmail,
        markSent: markInstantEmailSent,
        appUrl: process.env.APP_URL ?? "",
      }),
  });

  // Daily digest, once per user per run (docs/architecture/jobs-email.md, "Trigger points"): checked after this
  // user's postings are done, not per posting the way the strong-match email is.
  const lastDigestSentAt = await getLastDigestSentAt(userId);
  await sendDigestEmailIfDue(userId, { digestTime: preferences.digestTime, lastDigestSentAt }, new Date(), {
    getUserEmail,
    getDigestPostings,
    getFilteredOutCounts: getDigestFilteredOutCounts,
    sendEmail,
    markSent: markDigestSent,
    appUrl: process.env.APP_URL ?? "",
  });

  return { extracted: extractResult.processed, scored: scoreResult.processed };
}
