import type { WorkSetup } from "./preferences-store";

const WORK_SETUP_LABELS: Record<WorkSetup, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  on_site: "On-site",
};

export type MismatchPosting = {
  yearsRequired: number | null;
  workSetup: WorkSetup | null;
};

export type MismatchProfile = {
  /** Null when the Profile has no Experience entries at all -- there's nothing to compare, so the years check is
   *  skipped rather than asserting a verified "0 years" the owner never actually confirmed. A real `0` (an
   *  Experience section whose dates genuinely span no time) still compares normally. */
  yearsExperience: number | null;
  /** The owner's own acceptable set from `job_preferences.workSetups`. A non-remote posting is only flagged when
   *  this is narrowed to Remote alone -- accepting Hybrid and On-site too isn't a preference for Remote
   *  specifically, it's the same "no restriction expressed" the rest of this filter already means when it's left
   *  at its permissive default. Only an owner who's actually ruled out everything but Remote gets this flag. */
  preferredWorkSetups: WorkSetup[];
};

/** Requirement mismatches between a posting and the owner's own Profile/preferences -- distinct from Skills
 *  matching, which is about what the posting asks for; this is about what the posting states as a bar the owner's
 *  own numbers or stated preference don't clear (docs/mockups/job-finder.md, "Redesign" -- the detail page). These
 *  are worth a second look, not a confirmed disqualification -- a posting's stated "years required" is routinely
 *  a wish-list, not a hard cutoff. No AI call: every comparison is a plain numeric or set check against
 *  already-extracted fields. */
export function requirementMismatches(posting: MismatchPosting, profile: MismatchProfile): string[] {
  const mismatches: string[] = [];

  if (
    posting.yearsRequired !== null &&
    profile.yearsExperience !== null &&
    profile.yearsExperience < posting.yearsRequired
  ) {
    mismatches.push(`Requires ${posting.yearsRequired}+ years; your CV shows ${profile.yearsExperience}`);
  }

  const remoteOnly = profile.preferredWorkSetups.length === 1 && profile.preferredWorkSetups[0] === "remote";
  if (posting.workSetup && posting.workSetup !== "remote" && remoteOnly) {
    mismatches.push(`${WORK_SETUP_LABELS[posting.workSetup]} role, but you prefer remote work`);
  }

  return mismatches;
}
