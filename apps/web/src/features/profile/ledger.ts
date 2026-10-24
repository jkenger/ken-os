import type { ProfileDetails } from "@ken-os/domain";
import type { PortfolioProfile } from "@ken-os/portfolio";
import { portfolioProfile, type PublishChoices } from "@/features/portfolio/snapshot";

// The Profile ledger: one row per section with what it holds and where it stands against the saved Profile and the live
// Portfolio snapshot. Pure, so the client works it out on every edit. Spec: docs/mockups/profile.md, direction A.

export type LedgerSectionId =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "languages"
  | "local-fields";

/** One state per row, in the order it wins: an edit not saved yet beats everything the server knows. */
export type LedgerState = "unsaved" | "empty" | "private" | "not-published" | "changed" | "published";

export interface LedgerRow {
  id: LedgerSectionId;
  title: string;
  /** Filled fields for Contact, entries for a list section, 1 or 0 for Summary. */
  count: number;
  /** A one-line glimpse of what is there; empty when nothing is. */
  glimpse: string;
  state: LedgerState;
}

type PublicPart = (profile: PortfolioProfile) => unknown;

const SECTIONS: {
  id: LedgerSectionId;
  title: string;
  count: (details: ProfileDetails) => number;
  glimpse: (details: ProfileDetails) => string;
  /** The part of the public snapshot this section feeds; none for a section that is never published. */
  publicPart?: PublicPart;
}[] = [
  {
    id: "contact",
    title: "Contact",
    count: ({ contact }) =>
      [contact.fullName, contact.headline, contact.email, contact.phone, contact.city, contact.country].filter(
        (value) => value.trim(),
      ).length + contact.links.length,
    glimpse: ({ contact }) => list([contact.email, ...contact.links.map((link) => bare(link.url))]),
    publicPart: ({ name, headline, email, location, links }) => ({ name, headline, email, location, links }),
  },
  {
    id: "summary",
    title: "Summary",
    count: ({ summary }) => (summary.trim() ? 1 : 0),
    glimpse: ({ summary }) => summary.trim(),
    publicPart: ({ summary }) => summary,
  },
  {
    id: "experience",
    title: "Experience",
    count: ({ experience }) => experience.length,
    glimpse: ({ experience }) => list(experience.map((role) => list([role.company, role.title]))),
    publicPart: ({ experience }) => experience,
  },
  {
    id: "education",
    title: "Education",
    count: ({ education }) => education.length,
    glimpse: ({ education }) => list(education.map((school) => school.school)),
    publicPart: ({ education }) => education,
  },
  {
    id: "skills",
    title: "Skills",
    count: ({ skills }) => skills.length,
    glimpse: ({ skills }) => list(skills.map((group) => group.name || group.items.join(", "))),
    publicPart: ({ skills }) => skills,
  },
  {
    id: "projects",
    title: "Projects",
    count: ({ projects }) => projects.length,
    glimpse: ({ projects }) => list(projects.map((project) => project.name)),
    publicPart: ({ projects }) => projects,
  },
  {
    id: "certifications",
    title: "Certifications",
    count: ({ certifications }) => certifications.length,
    glimpse: ({ certifications }) => list(certifications.map((cert) => cert.name)),
    publicPart: ({ certifications }) => certifications,
  },
  {
    id: "languages",
    title: "Languages",
    count: ({ languages }) => languages.length,
    glimpse: ({ languages }) => list(languages.map((language) => language.name)),
    publicPart: ({ languages }) => languages,
  },
  {
    id: "local-fields",
    title: "Local fields",
    count: ({ local }) =>
      local.enabled
        ? [local.birthdate, local.civilStatus, local.nationality, local.address].filter((value) => value.trim())
            .length + local.references.length
        : 0,
    glimpse: ({ local }) => (local.enabled ? list([local.nationality, local.civilStatus]) : ""),
  },
];

function list(values: string[]) {
  return values.filter((value) => value.trim()).join(", ");
}

function bare(url: string) {
  return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

/** Deep equality that ignores key order: the snapshot comes back from a jsonb column, which reorders keys. A missing
 *  key and an undefined one are the same. */
function same(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((item, i) => same(item, b[i]));
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => same(left[key], right[key]));
  }
  return a === b;
}

/**
 * `details` is the form as typed, `saved` what Save last stored, `published` the live snapshot's profile (null when
 * nothing is live), and `choices` what the next Publish would include. "Changed" means a Publish now would change that
 * section on the public resume.
 */
export function ledgerRows(
  details: ProfileDetails,
  saved: ProfileDetails,
  published: PortfolioProfile | null,
  choices: PublishChoices,
): LedgerRow[] {
  const next = portfolioProfile(saved, choices);
  return SECTIONS.map(({ id, title, count, glimpse, publicPart }) => {
    const filled = count(details);
    const key = id === "local-fields" ? "local" : id;
    let state: LedgerState;
    if (!same(details[key], saved[key])) state = "unsaved";
    else if (!filled) state = "empty";
    else if (!publicPart) state = "private";
    else if (!published) state = "not-published";
    else state = same(publicPart(next), publicPart(published)) ? "published" : "changed";
    return { id, title, count: filled, glimpse: glimpse(details), state };
  });
}
