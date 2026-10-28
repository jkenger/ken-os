import type { ProfileDetails, ProfileExperience } from "@ken-os/domain";
import type { LedgerSectionId } from "./ledger";

// Profile's Review: what a resume reader would miss, worked out from the details alone, and how complete the Profile
// is as a percentage. Pure and rule-based, so the numbers are always true. Optional sections (projects,
// certifications, languages, local fields) are never issues when empty.

export interface ReviewIssue {
  /** Stable within one review, for list keys. */
  id: string;
  section: LedgerSectionId;
  /** An action, in app language: a verb and what to add or change. */
  text: string;
  /** How many percentage points fixing it adds. Every issue of an empty Profile adds up to 100. */
  weight: number;
}

/** Each core section's share of 100. Contact splits its share evenly over its five parts. */
export const REVIEW_WEIGHTS = { contact: 20, summary: 15, experience: 30, education: 15, skills: 20 } as const;
/** What a short or long summary costs, out of the summary's share. */
const SUMMARY_LENGTH_WEIGHT = 5;
/** A role's share of experience splits as start date 1, bullets 2 (or a number in a bullet 1, once there are bullets). */
const ROLE_PARTS = { start: 1, bullets: 2, numbers: 1 } as const;

const SUMMARY_MIN = 150;
const SUMMARY_MAX = 600;

const filled = (value: string) => value.trim().length > 0;
const roleName = (role: ProfileExperience) => [role.title, role.company].filter(filled).join(", ") || "a role";

export function reviewProfile(details: ProfileDetails): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const add = (section: LedgerSectionId, key: string, text: string, weight: number) =>
    issues.push({ id: `${section}:${key}`, section, text, weight });

  const { contact } = details;
  const part = REVIEW_WEIGHTS.contact / 5;
  if (!filled(contact.fullName)) add("contact", "name", "Add your name", part);
  if (!filled(contact.headline)) add("contact", "headline", "Add a headline", part);
  if (!filled(contact.email)) add("contact", "email", "Add an email", part);
  if (!filled(contact.city) && !filled(contact.country)) add("contact", "location", "Add a location", part);
  if (!contact.links.some((link) => filled(link.url)))
    add("contact", "links", "Add a link, such as GitHub or LinkedIn", part);

  const summary = details.summary.trim();
  if (!summary) add("summary", "missing", "Write a summary", REVIEW_WEIGHTS.summary);
  else if (summary.length < SUMMARY_MIN)
    add("summary", "short", "Lengthen the summary to 2 to 4 sentences", SUMMARY_LENGTH_WEIGHT);
  else if (summary.length > SUMMARY_MAX)
    add("summary", "long", `Shorten the summary to under ${SUMMARY_MAX} characters`, SUMMARY_LENGTH_WEIGHT);

  if (!details.experience.length) add("experience", "missing", "Add a role", REVIEW_WEIGHTS.experience);
  // Each role gets an equal share of experience's 30, split over its parts.
  const unit = REVIEW_WEIGHTS.experience / (details.experience.length * (ROLE_PARTS.start + ROLE_PARTS.bullets));
  details.experience.forEach((role, index) => {
    const name = roleName(role);
    const bullets = role.bullets.filter(filled);
    if (!filled(role.start))
      add("experience", `${index}:start`, `Add a start date to ${name}`, unit * ROLE_PARTS.start);
    if (!bullets.length) add("experience", `${index}:bullets`, `Add bullets to ${name}`, unit * ROLE_PARTS.bullets);
    else if (!bullets.some((bullet) => /\d/.test(bullet)))
      add("experience", `${index}:numbers`, `Add a number to a bullet in ${name}`, unit * ROLE_PARTS.numbers);
  });

  if (!details.education.length) add("education", "missing", "Add a school", REVIEW_WEIGHTS.education);
  if (!details.skills.some((group) => group.items.some(filled)))
    add("skills", "missing", "Add skills", REVIEW_WEIGHTS.skills);

  return issues;
}

/** How complete the Profile is, 0 to 100, as a whole number. */
export function profileScore(details: ProfileDetails): number {
  const missing = reviewProfile(details).reduce((sum, issue) => sum + issue.weight, 0);
  return Math.max(0, Math.round(100 - missing));
}
