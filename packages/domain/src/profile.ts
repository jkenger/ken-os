// The owner's career details, stored as fields so every resume is a view of them. Spec: docs/product/profile-resume.md.

export interface ProfileLink { label: string; url: string }

export interface ProfileContact {
  fullName: string;
  /** The target title shown under the name, such as "Full-stack engineer". */
  headline: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  links: ProfileLink[];
}

/** Months are `YYYY-MM` (or `YYYY` when only the year is known); an empty `end` means Present. */
export interface ProfileExperience { company: string; title: string; location: string; start: string; end: string; bullets: string[] }
export interface ProfileEducation { school: string; degree: string; field: string; start: string; end: string; notes: string }
export interface ProfileSkillGroup { name: string; items: string[] }
export interface ProfileProject { name: string; link: string; description: string; bullets: string[] }
export interface ProfileCertification { name: string; issuer: string; date: string }
export interface ProfileLanguage { name: string; level: string }

/** Fields some local markets expect. Off unless `enabled`, and ATS templates never print them. */
export interface ProfileLocalFields {
  enabled: boolean;
  birthdate: string;
  civilStatus: string;
  nationality: string;
  address: string;
  references: string[];
}

export interface ProfileDetails {
  contact: ProfileContact;
  summary: string;
  experience: ProfileExperience[];
  education: ProfileEducation[];
  skills: ProfileSkillGroup[];
  projects: ProfileProject[];
  certifications: ProfileCertification[];
  languages: ProfileLanguage[];
  local: ProfileLocalFields;
}

export const PROFILE_LIMITS = { text: 200, url: 500, summary: 1500, line: 400, lines: 12, entries: 30, items: 40 } as const;

export function emptyProfile(): ProfileDetails {
  return {
    contact: { fullName: "", headline: "", email: "", phone: "", city: "", country: "", links: [] },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    local: { enabled: false, birthdate: "", civilStatus: "", nationality: "", address: "", references: [] },
  };
}

export class ProfileFieldError extends Error {}

/**
 * `save` checks what the owner typed and throws a `ProfileFieldError` naming the field. `import` cleans what the AI
 * read from a file: it cuts overlong text and drops dates it can't read, so a messy file still gives a usable draft.
 */
export type ProfileMode = "save" | "import";

const MONTH = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, field: string, max: number, mode: ProfileMode): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (clean.length <= max) return clean;
  if (mode === "import") return clean.slice(0, max).trim();
  throw new ProfileFieldError(`${field} is too long. Keep it under ${max} characters`);
}

function month(value: unknown, field: string, mode: ProfileMode): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean || MONTH.test(clean)) return clean;
  if (mode === "import") return "";
  throw new ProfileFieldError(`${field}: use a month like 2024-03`);
}

function url(value: unknown, field: string, mode: ProfileMode): string {
  const clean = text(value, field, PROFILE_LIMITS.url, mode);
  if (!clean) return "";
  const withScheme = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch { /* falls through */ }
  if (mode === "import") return "";
  throw new ProfileFieldError(`${field}: use a web address`);
}

function list<T>(value: unknown, field: string, max: number, mode: ProfileMode, item: (entry: unknown) => T, keep: (entry: T) => boolean): T[] {
  // Blank entries (an empty textarea line, a trailing comma) are dropped before counting, so they never hit the limit.
  const entries = Array.isArray(value) ? value : [];
  const kept = (mode === "import" ? entries.slice(0, max * 2) : entries).map(item).filter(keep);
  if (kept.length > max && mode === "save") throw new ProfileFieldError(`${field}: up to ${max} entries`);
  return kept.slice(0, max);
}

function lines(value: unknown, field: string, mode: ProfileMode, max: number = PROFILE_LIMITS.lines): string[] {
  return list(value, field, max, mode, (line) => text(line, field, PROFILE_LIMITS.line, mode), Boolean);
}

const filled = (entry: object) => Object.values(entry).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));

/** Checks and trims a whole Profile. Unknown keys are dropped and missing ones become empty. */
export function normalizeProfile(value: unknown, mode: ProfileMode): ProfileDetails {
  const input = record(value);
  const contact = record(input.contact);
  const local = record(input.local);
  const { text: short, entries } = PROFILE_LIMITS;
  return {
    contact: {
      fullName: text(contact.fullName, "Name", short, mode),
      headline: text(contact.headline, "Headline", short, mode),
      email: text(contact.email, "Email", short, mode),
      phone: text(contact.phone, "Phone", short, mode),
      city: text(contact.city, "City", short, mode),
      country: text(contact.country, "Country", short, mode),
      links: list(contact.links, "Links", 10, mode, (entry) => {
        const link = record(entry);
        return { label: text(link.label, "Link label", short, mode), url: url(link.url, "Link", mode) };
      }, (link) => Boolean(link.url)),
    },
    summary: text(input.summary, "Summary", PROFILE_LIMITS.summary, mode),
    experience: list(input.experience, "Experience", entries, mode, (entry) => {
      const role = record(entry);
      return {
        company: text(role.company, "Company", short, mode),
        title: text(role.title, "Title", short, mode),
        location: text(role.location, "Location", short, mode),
        start: month(role.start, "Start", mode),
        end: month(role.end, "End", mode),
        bullets: lines(role.bullets, "Bullet points", mode),
      };
    }, filled),
    education: list(input.education, "Education", entries, mode, (entry) => {
      const school = record(entry);
      return {
        school: text(school.school, "School", short, mode),
        degree: text(school.degree, "Degree", short, mode),
        field: text(school.field, "Field", short, mode),
        start: month(school.start, "Start", mode),
        end: month(school.end, "End", mode),
        notes: text(school.notes, "Notes", PROFILE_LIMITS.line, mode),
      };
    }, filled),
    skills: list(input.skills, "Skills", entries, mode, (entry) => {
      const group = record(entry);
      return { name: text(group.name, "Skill group", short, mode), items: lines(group.items, "Skills", mode, PROFILE_LIMITS.items) };
    }, (group) => group.items.length > 0),
    projects: list(input.projects, "Projects", entries, mode, (entry) => {
      const project = record(entry);
      return {
        name: text(project.name, "Project", short, mode),
        link: url(project.link, "Project link", mode),
        description: text(project.description, "Description", PROFILE_LIMITS.line, mode),
        bullets: lines(project.bullets, "Bullet points", mode),
      };
    }, filled),
    certifications: list(input.certifications, "Certifications", entries, mode, (entry) => {
      const cert = record(entry);
      return { name: text(cert.name, "Certification", short, mode), issuer: text(cert.issuer, "Issuer", short, mode), date: month(cert.date, "Date", mode) };
    }, (cert) => Boolean(cert.name)),
    languages: list(input.languages, "Languages", entries, mode, (entry) => {
      const language = record(entry);
      return { name: text(language.name, "Language", short, mode), level: text(language.level, "Level", short, mode) };
    }, (language) => Boolean(language.name)),
    local: {
      enabled: local.enabled === true,
      birthdate: text(local.birthdate, "Birthdate", short, mode),
      civilStatus: text(local.civilStatus, "Civil status", short, mode),
      nationality: text(local.nationality, "Nationality", short, mode),
      address: text(local.address, "Address", PROFILE_LIMITS.line, mode),
      references: lines(local.references, "References", mode, 5),
    },
  };
}

/**
 * Lays an imported draft over the form for review, including edits not saved yet. Sections the file filled replace the
 * form's; sections it left empty keep what's there, so importing a thin file never wipes details the owner typed. Local fields are
 * the owner's choice and only fill gaps.
 */
export function mergeImport(saved: ProfileDetails, draft: ProfileDetails): ProfileDetails {
  const pick = <T>(next: T[], current: T[]) => next.length ? next : current;
  const field = (key: Exclude<keyof ProfileContact, "links">) => draft.contact[key] || saved.contact[key];
  return {
    contact: {
      fullName: field("fullName"),
      headline: field("headline"),
      email: field("email"),
      phone: field("phone"),
      city: field("city"),
      country: field("country"),
      links: pick(draft.contact.links, saved.contact.links),
    },
    summary: draft.summary || saved.summary,
    experience: pick(draft.experience, saved.experience),
    education: pick(draft.education, saved.education),
    skills: pick(draft.skills, saved.skills),
    projects: pick(draft.projects, saved.projects),
    certifications: pick(draft.certifications, saved.certifications),
    languages: pick(draft.languages, saved.languages),
    local: {
      enabled: saved.local.enabled,
      birthdate: saved.local.birthdate || draft.local.birthdate,
      civilStatus: saved.local.civilStatus || draft.local.civilStatus,
      nationality: saved.local.nationality || draft.local.nationality,
      address: saved.local.address || draft.local.address,
      references: pick(saved.local.references, draft.local.references),
    },
  };
}
