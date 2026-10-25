import type { ProfileDetails } from "./profile";
import { printDateRange } from "./resume";

// Autofill review: what a resume would change in the form, one change per contact or local field, the summary, and
// each list section as a whole. Only fields the file fills count; a field the file leaves empty keeps what is there.
// Spec: docs/product/profile-resume.md, "Step 5 design".

export interface AutofillChange {
  /** Where the change goes, like `contact.email`, `summary` or `experience`. */
  id: string;
  section: string;
  label: string;
  /** The value as lines, for showing old against new. */
  before: string[];
  after: string[];
}

type Contact = ProfileDetails["contact"];
type Local = ProfileDetails["local"];

const CONTACT_FIELDS: [Exclude<keyof Contact, "links">, string][] = [
  ["fullName", "Name"],
  ["headline", "Headline"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["city", "City"],
  ["country", "Country"],
];

const LOCAL_FIELDS: [Exclude<keyof Local, "enabled" | "references">, string][] = [
  ["birthdate", "Birthdate"],
  ["civilStatus", "Civil status"],
  ["nationality", "Nationality"],
  ["address", "Address"],
];

const join = (parts: string[], separator = ", ") => parts.filter(Boolean).join(separator);
/** "3 bullets", so an entry whose bullets changed doesn't print the same line twice. */
const bullets = (items: string[]) =>
  items.length ? `${items.length} ${items.length === 1 ? "bullet" : "bullets"}` : "";

/** The list sections, each printed one line per entry. */
const LISTS = {
  experience: {
    label: "Experience",
    lines: (d: ProfileDetails) =>
      d.experience.map((r) =>
        join([join([r.title, r.company]), printDateRange(r.start, r.end), bullets(r.bullets)], " · "),
      ),
  },
  education: {
    label: "Education",
    lines: (d: ProfileDetails) =>
      d.education.map((e) => join([join([e.school, e.degree, e.field]), printDateRange(e.start, e.end)], " · ")),
  },
  skills: {
    label: "Skills",
    lines: (d: ProfileDetails) => d.skills.map((g) => join([g.name, g.items.join(", ")], ": ")),
  },
  projects: {
    label: "Projects",
    lines: (d: ProfileDetails) => d.projects.map((p) => join([p.name, p.description, bullets(p.bullets)], " · ")),
  },
  certifications: {
    label: "Certifications",
    lines: (d: ProfileDetails) => d.certifications.map((c) => join([c.name, c.issuer])),
  },
  languages: {
    label: "Languages",
    lines: (d: ProfileDetails) => d.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)),
  },
} as const;

type ListId = keyof typeof LISTS;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The changes the draft would make to the current form, in form order, and the sections the file fills with exactly
 * what is there already (`matches`, each named once).
 */
export function autofillChanges(
  current: ProfileDetails,
  draft: ProfileDetails,
): { changes: AutofillChange[]; matches: string[] } {
  const changes: AutofillChange[] = [];
  const matches: string[] = [];
  const add = (id: string, section: string, label: string, before: string[], after: string[], differs: boolean) => {
    if (!after.length) return;
    if (differs) changes.push({ id, section, label, before, after });
    else if (!matches.includes(section)) matches.push(section);
  };
  const line = (value: string) => (value ? [value] : []);

  for (const [key, label] of CONTACT_FIELDS)
    add(
      `contact.${key}`,
      "Contact",
      label,
      line(current.contact[key]),
      line(draft.contact[key]),
      current.contact[key] !== draft.contact[key],
    );
  const links = (d: ProfileDetails) => d.contact.links.map((l) => join([l.label, l.url], ": "));
  add(
    "contact.links",
    "Contact",
    "Links",
    links(current),
    links(draft),
    !same(current.contact.links, draft.contact.links),
  );
  add("summary", "Summary", "Summary", line(current.summary), line(draft.summary), current.summary !== draft.summary);
  for (const id of Object.keys(LISTS) as ListId[]) {
    const { label, lines } = LISTS[id];
    add(id, label, label, lines(current), lines(draft), !same(current[id], draft[id]));
  }
  for (const [key, label] of LOCAL_FIELDS)
    add(
      `local.${key}`,
      "Local fields",
      label,
      line(current.local[key]),
      line(draft.local[key]),
      current.local[key] !== draft.local[key],
    );
  add(
    "local.references",
    "Local fields",
    "References",
    current.local.references,
    draft.local.references,
    !same(current.local.references, draft.local.references),
  );
  return { changes, matches: matches.filter((section) => !changes.some((change) => change.section === section)) };
}

/** The form with one change taken from the draft. A local field also turns local fields on, so it shows. */
export function applyAutofill(current: ProfileDetails, draft: ProfileDetails, id: string): ProfileDetails {
  const next = structuredClone(current);
  const [group, key] = id.split(".");
  if (group === "contact" && key)
    Object.assign(next.contact, { [key]: structuredClone(draft.contact[key as keyof Contact]) });
  else if (group === "local" && key) {
    Object.assign(next.local, { [key]: structuredClone(draft.local[key as keyof Local]), enabled: true });
  } else if (group === "summary") next.summary = draft.summary;
  else if (group in LISTS) Object.assign(next, { [group]: structuredClone(draft[group as ListId]) });
  return next;
}
