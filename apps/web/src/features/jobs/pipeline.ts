import { extractPosting, scoreJobPosting } from "@ken-os/agents";
import type { ProfileDetails } from "@ken-os/domain";
import { getProfile } from "@/features/profile/store";
import { checkFreehire } from "./check-freehire";
import { getPreferences } from "./preferences-store";
import { processPostings, scorePostings } from "./process";
import { deriveRoles } from "./roles";
import { freehireDetailUrl, parseFreehireDetail } from "./scrapers/freehire";
import {
  claimPendingPostings,
  getNeedingScore,
  saveExtractedFields,
  saveScore,
  savePostings,
  unclaimPosting,
} from "./store";

// One account's run of each pipeline stage (plans/jobs-score.md, "Architecture decision"): the scheduler's poll
// loops these over every account with saved Jobs settings, and the "Run pipeline" button calls them for just the
// signed-in account, so the two never disagree about what one account's run actually does.

/** Searches freehire for this account's own roles and saves whatever's new into this account's own postings. */
export async function scrapeFreehireForUser(
  userId: string,
  secret: string,
  expectedSecret: string,
): Promise<{ ok: boolean; reason: string; found: number }> {
  const [profile, preferences] = await Promise.all([getProfile(userId), getPreferences(userId)]);
  return checkFreehire({
    secret,
    expectedSecret,
    keywords: preferences.roles.length > 0 ? preferences.roles : deriveRoles(profile.details),
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
  });

  return { extracted: extractResult.processed, scored: scoreResult.processed };
}
