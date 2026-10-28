import type { ProfileDetails, ProfileExperience } from "@ken-os/domain";
import type { LedgerSectionId } from "./ledger";

// Profile's Review: what a resume reader would miss, worked out from the details alone. Pure and rule-based, so the
// count is always true; the Claude-written review is a later step. Optional sections (projects, certifications,
// languages, local fields) are never issues when empty.

export interface ReviewIssue {
  /** Stable within one review, for list keys. */
  id: string;
  section: LedgerSectionId;
  /** An action, in app language: a verb and what to add or change. */
  text: string;
}

const SUMMARY_MIN = 150;
const SUMMARY_MAX = 600;

const filled = (value: string) => value.trim().length > 0;
const roleName = (role: ProfileExperience) => [role.title, role.company].filter(filled).join(", ") || "a role";

export function reviewProfile(details: ProfileDetails): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const add = (section: LedgerSectionId, key: string, text: string) =>
    issues.push({ id: `${section}:${key}`, section, text });

  const { contact } = details;
  if (!filled(contact.fullName)) add("contact", "name", "Add your name");
  if (!filled(contact.headline)) add("contact", "headline", "Add a headline");
  if (!filled(contact.email)) add("contact", "email", "Add an email");
  if (!filled(contact.city) && !filled(contact.country)) add("contact", "location", "Add a location");
  if (!contact.links.some((link) => filled(link.url)))
    add("contact", "links", "Add a link, such as GitHub or LinkedIn");

  const summary = details.summary.trim();
  if (!summary) add("summary", "missing", "Write a summary");
  else if (summary.length < SUMMARY_MIN) add("summary", "short", "Lengthen the summary to 2 to 4 sentences");
  else if (summary.length > SUMMARY_MAX)
    add("summary", "long", `Shorten the summary to under ${SUMMARY_MAX} characters`);

  if (!details.experience.length) add("experience", "missing", "Add a role");
  details.experience.forEach((role, index) => {
    const name = roleName(role);
    const bullets = role.bullets.filter(filled);
    if (!filled(role.start)) add("experience", `${index}:start`, `Add a start date to ${name}`);
    if (!bullets.length) add("experience", `${index}:bullets`, `Add bullets to ${name}`);
    else if (!bullets.some((bullet) => /\d/.test(bullet)))
      add("experience", `${index}:numbers`, `Add a number to a bullet in ${name}`);
  });

  if (!details.education.length) add("education", "missing", "Add a school");
  if (!details.skills.some((group) => group.items.some(filled))) add("skills", "missing", "Add skills");

  return issues;
}
