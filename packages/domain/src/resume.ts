import type { ProfileDetails } from "./profile";

// How a Profile prints as a resume: the three ATS-safe templates, paper sizes, and the text rules every template
// shares. Spec: docs/product/profile-resume.md, "Templates".

export const RESUME_TEMPLATES = [
  { id: "classic", label: "Classic" },
  { id: "compact", label: "Compact" },
  { id: "technical", label: "Technical" },
] as const;

export type ResumeTemplate = (typeof RESUME_TEMPLATES)[number]["id"];

export const PAPER_SIZES = [
  { id: "letter", label: "Letter" },
  { id: "a4", label: "A4" },
] as const;

export type PaperSize = (typeof PAPER_SIZES)[number]["id"];

export function isResumeTemplate(value: unknown): value is ResumeTemplate {
  return RESUME_TEMPLATES.some((template) => template.id === value);
}

export function isPaperSize(value: unknown): value is PaperSize {
  return PAPER_SIZES.some((paper) => paper.id === value);
}

export type ResumeSection =
  "summary" | "experience" | "education" | "skills" | "projects" | "certifications" | "languages";

/** Section order per template. Technical puts skills and projects first for engineering roles. */
export const SECTION_ORDER: Record<ResumeTemplate, ResumeSection[]> = {
  classic: ["summary", "experience", "education", "skills", "projects", "certifications", "languages"],
  compact: ["summary", "experience", "skills", "education", "projects", "certifications", "languages"],
  technical: ["summary", "skills", "projects", "experience", "education", "certifications", "languages"],
};

/** Standard headings, so an ATS files each section correctly. */
export const SECTION_HEADINGS: Record<ResumeSection, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  languages: "Languages",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2024-03` prints as "Mar 2024", `2024` as "2024". */
export function printMonth(value: string): string {
  const [year, month] = value.split("-");
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year;
}

/** One date format everywhere: "Mar 2024 – Present". An empty end means Present only when there is a start. */
export function printDateRange(start: string, end: string): string {
  if (!start && !end) return "";
  if (!start) return printMonth(end);
  return `${printMonth(start)} – ${end ? printMonth(end) : "Present"}`;
}

/** The contact line, in the body rather than a page header so an ATS reads it. Links print as plain addresses. */
export function contactLine(details: ProfileDetails): string[] {
  const { email, phone, city, country, links } = details.contact;
  const place = [city, country].filter(Boolean).join(", ");
  const addresses = links.map((link) => link.url.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  return [email, phone, place, ...addresses].filter(Boolean);
}

/** Which sections have something to print. Local fields are never printed: ATS templates leave them out. */
export function sectionsToPrint(details: ProfileDetails, template: ResumeTemplate): ResumeSection[] {
  const filled: Record<ResumeSection, boolean> = {
    summary: Boolean(details.summary),
    experience: details.experience.length > 0,
    education: details.education.length > 0,
    skills: details.skills.length > 0,
    projects: details.projects.length > 0,
    certifications: details.certifications.length > 0,
    languages: details.languages.length > 0,
  };
  return SECTION_ORDER[template].filter((section) => filled[section]);
}

/** A download name like "Ken Gervacio Resume.pdf", with characters file systems reject removed. */
export function resumeFileName(details: ProfileDetails): string {
  const name = details.contact.fullName.replace(/[\\/:*?"<>|]/g, "").trim();
  return `${name ? `${name} ` : ""}Resume.pdf`;
}
