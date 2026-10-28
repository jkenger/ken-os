import type { ProfileDetails } from "./profile";
import { knownNumbers } from "./rewrite";

// Profile's analyzer: one run judges the summary and each role's and project's bullets against a written standard, and
// recommends a better version of each. The model judges what needs reading (an action verb, results over duties);
// code judges what can be counted (pronouns, numbers, length) and always wins. A recommendation that brings in a number
// the Profile doesn't have is dropped. Spec: docs/product/profile-resume.md, "Analyzer".

export type AnalysisKind = "summary" | "bullets";

export interface AnalysisCriterion {
  id: string;
  label: string;
  /** Checked by code from the text; the model's verdict is ignored. */
  computed?: true;
}

/** The standard every recommendation is written to and every section is judged by. */
export const ANALYSIS_STANDARD: Record<AnalysisKind, readonly AnalysisCriterion[]> = {
  summary: [
    { id: "role", label: "Opens with the role and experience" },
    { id: "results", label: "Shows results, not duties" },
    { id: "specifics", label: "Names tools and numbers" },
    { id: "pronouns", label: "No I, me or my", computed: true },
    { id: "length", label: "2 to 4 sentences", computed: true },
  ],
  bullets: [
    { id: "verb", label: "Starts with an action verb" },
    { id: "results", label: "Shows results, not duties" },
    { id: "numbers", label: "Names a number", computed: true },
    { id: "pronouns", label: "No I, me or my", computed: true },
    { id: "length", label: "One line each, about 20 words", computed: true },
  ],
};

export interface AnalysisTarget {
  /** `summary`, `experience.0` or `projects.0`. */
  id: string;
  section: "summary" | "experience" | "projects";
  kind: AnalysisKind;
  /** Where it sits, such as "Full Stack Engineer, Elite Medical Care". */
  place: string;
  /** The summary as one line, or the entry's bullets. */
  lines: string[];
}

export interface AnalysisCheck {
  id: string;
  label: string;
  pass: boolean;
  /** What to change, in a few words; empty when it passes or the model gave none. */
  note: string;
}

export interface AnalysisSection {
  id: string;
  section: AnalysisTarget["section"];
  kind: AnalysisKind;
  place: string;
  /** The lines as they were when judged, so an edit since marks the section stale. */
  before: string[];
  checks: AnalysisCheck[];
  /** The rewrite to use, one paragraph for a summary or the full bullet list; null when none is safe or needed. */
  recommendation: string[] | null;
  /** What to add that only the owner knows, such as a number; empty when nothing. */
  tip: string;
}

export interface ProfileAnalysis {
  analyzedAt: string;
  sections: AnalysisSection[];
}

/** What the model returns, before `checkAnalysis` cleans it. */
export interface AnalysisOutput {
  sections: {
    id: string;
    checks: { id: string; pass: boolean; note: string }[];
    recommendation: string[];
    tip: string;
  }[];
}

const filled = (line: string) => line.trim().length > 0;
const clean = (line: string) => line.replace(/\s+/g, " ").trim();
const LIMITS = { line: 400, summary: 1500, lines: 12, note: 200 } as const;
const BULLET_WORDS = 24;

/** The summary always (an empty one can be written), then each role and project that has bullets. */
export function analysisTargets(details: ProfileDetails): AnalysisTarget[] {
  const summary = details.summary.trim();
  const targets: AnalysisTarget[] = [
    { id: "summary", section: "summary", kind: "summary", place: "Summary", lines: summary ? [summary] : [] },
  ];
  details.experience.forEach((role, entry) => {
    const lines = role.bullets.filter(filled);
    if (!lines.length) return;
    const place = [role.title, role.company].filter(filled).join(", ") || `Role ${entry + 1}`;
    targets.push({ id: `experience.${entry}`, section: "experience", kind: "bullets", place, lines });
  });
  details.projects.forEach((project, entry) => {
    const lines = project.bullets.filter(filled);
    if (!lines.length) return;
    targets.push({
      id: `projects.${entry}`,
      section: "projects",
      kind: "bullets",
      place: project.name || `Project ${entry + 1}`,
      lines,
    });
  });
  return targets;
}

const hasPronoun = (line: string) => /\bI\b|\bI'(m|ve|d|ll)\b/.test(line) || /\b(me|my|mine)\b/i.test(line);
const sentences = (text: string) => text.split(/[.!?]+(?:\s|$)/).filter(filled).length;
const words = (line: string) => line.split(/\s+/).filter(filled).length;

/** The verdict code gives for a computed criterion, from the lines as they are. */
function computed(kind: AnalysisKind, id: string, lines: string[]): { pass: boolean; note: string } {
  if (id === "pronouns") {
    const pass = !lines.some(hasPronoun);
    return { pass, note: pass ? "" : "Drop I, me and my" };
  }
  if (id === "numbers") {
    const pass = lines.some((line) => /\d/.test(line));
    return { pass, note: pass ? "" : "Add a number: how many, how much, how fast" };
  }
  if (kind === "summary") {
    const count = lines.length ? sentences(lines[0]) : 0;
    const pass = count >= 2 && count <= 4;
    return { pass, note: pass ? "" : count < 2 ? `${count} sentence, aim for 2 to 4` : `${count} sentences, cut to 4` };
  }
  const long = lines.filter((line) => words(line) > BULLET_WORDS).length;
  return { pass: long === 0, note: long ? `${long} ${long === 1 ? "bullet runs" : "bullets run"} past 20 words` : "" };
}

/**
 * Turns the model's answer into the report: one section per target in target order, every criterion of the standard
 * in order (computed ones from the text, the rest from the model, a missing one as a pass), and a recommendation only
 * when it is new and invents no number. Anything the model returns for an unknown or repeated id is dropped.
 */
export function checkAnalysis(details: ProfileDetails, output: AnalysisOutput): AnalysisSection[] {
  const numbers = knownNumbers(details);
  const answers = new Map<string, AnalysisOutput["sections"][number]>();
  for (const section of output.sections) if (!answers.has(section.id)) answers.set(section.id, section);

  return analysisTargets(details).map((target) => {
    const answer = answers.get(target.id);
    const checks = ANALYSIS_STANDARD[target.kind].map(({ id, label, computed: byCode }) => {
      if (byCode) return { id, label, ...computed(target.kind, id, target.lines) };
      const verdict = answer?.checks.find((check) => check.id === id);
      return {
        id,
        label,
        pass: verdict?.pass ?? true,
        note: verdict ? clean(verdict.note).slice(0, LIMITS.note) : "",
      };
    });

    let lines = (answer?.recommendation ?? []).map(clean).filter(filled);
    if (target.kind === "summary") lines = lines.slice(0, 1);
    const max = target.kind === "summary" ? LIMITS.summary : LIMITS.line;
    const safe =
      lines.length > 0 &&
      lines.length <= LIMITS.lines &&
      lines.every((line) => line.length <= max) &&
      lines.every((line) => (line.match(/\d+(?:[.,]\d+)?/g) ?? []).every((number) => numbers.has(number))) &&
      JSON.stringify(lines) !== JSON.stringify(target.lines.map(clean));

    return {
      id: target.id,
      section: target.section,
      kind: target.kind,
      place: target.place,
      before: target.lines,
      checks,
      recommendation: safe ? lines : null,
      tip: clean(answer?.tip ?? "").slice(0, LIMITS.note),
    };
  });
}

/** True when the lines a section judged are no longer what the Profile holds there. */
export function isAnalysisStale(section: AnalysisSection, details: ProfileDetails): boolean {
  const now = analysisTargets(details).find((target) => target.id === section.id);
  return !now || JSON.stringify(now.lines) !== JSON.stringify(section.before);
}

/** A copy of the details with the summary, or one entry's whole bullet list, replaced by a recommendation. */
export function applyAnalysis(details: ProfileDetails, id: string, lines: string[]): ProfileDetails {
  const next = structuredClone(details);
  if (id === "summary") {
    next.summary = lines.join(" ");
    return next;
  }
  const [section, entry] = id.split(".");
  const list = section === "experience" ? next.experience : section === "projects" ? next.projects : null;
  const item = list?.[Number(entry)];
  if (item) item.bullets = [...lines];
  return next;
}
