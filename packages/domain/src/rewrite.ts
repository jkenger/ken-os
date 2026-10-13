import type { ProfileDetails } from "./profile";

// The AI rewrite: which lines it may change, how a suggestion lands in the form, and the check that keeps it to the
// owner's facts. Spec: docs/product/profile-resume.md, "AI" and "Step 3 design".

/** A line the rewrite may change: the summary, or one experience or project bullet. Ids look like `summary`,
 *  `experience.0.2` (role 0, bullet 2) and `projects.1.0`. */
export interface RewriteTarget {
  id: string;
  text: string;
  /** Where the line sits, such as "Senior Engineer, Northwind". Helps the model and labels the review list. */
  place: string;
}

export interface RewriteSuggestion {
  id: string;
  place: string;
  before: string;
  after: string;
  /** Where a number would make the line stronger and the Profile doesn't have one. Never written into `after`. */
  tip: string | null;
}

export const REWRITE_TARGET_ROLE_MAX = 120;

/** Every line the rewrite may change. An empty summary is a target too, so the rewrite can write one. */
export function rewriteTargets(details: ProfileDetails): RewriteTarget[] {
  const targets: RewriteTarget[] = [{ id: "summary", text: details.summary, place: "Summary" }];
  details.experience.forEach((role, entry) => {
    const place = [role.title, role.company].filter(Boolean).join(", ") || `Role ${entry + 1}`;
    role.bullets.forEach((text, bullet) => {
      if (text.trim()) targets.push({ id: `experience.${entry}.${bullet}`, text, place });
    });
  });
  details.projects.forEach((project, entry) => {
    const place = project.name || `Project ${entry + 1}`;
    project.bullets.forEach((text, bullet) => {
      if (text.trim()) targets.push({ id: `projects.${entry}.${bullet}`, text, place });
    });
  });
  return targets;
}

/** The current text at a target id, or null when the line no longer exists (the owner removed it). */
export function textAt(details: ProfileDetails, id: string): string | null {
  if (id === "summary") return details.summary;
  const [section, entry, bullet] = id.split(".");
  const list = section === "experience" ? details.experience : section === "projects" ? details.projects : null;
  const line = list?.[Number(entry)]?.bullets[Number(bullet)];
  return typeof line === "string" ? line : null;
}

/** A copy of the details with one line replaced. The caller checks `textAt` first, so a line the owner edited since the
 *  rewrite is never overwritten. */
export function applyRewrite(details: ProfileDetails, id: string, text: string): ProfileDetails {
  const next = structuredClone(details);
  if (id === "summary") {
    next.summary = text;
    return next;
  }
  const [section, entry, bullet] = id.split(".");
  const list = section === "experience" ? next.experience : section === "projects" ? next.projects : null;
  const item = list?.[Number(entry)];
  if (item && Number(bullet) < item.bullets.length) item.bullets[Number(bullet)] = text;
  return next;
}

/** Every number written in the Profile, including years from dates, as the digits that appear. */
function knownNumbers(details: ProfileDetails): Set<string> {
  return new Set(JSON.stringify(details).match(/\d+(?:[.,]\d+)?/g) ?? []);
}

/**
 * Keeps only suggestions that are safe to show: a known target, real new text, and no number the Profile doesn't
 * already contain. A suggestion that would invent "40%" or "10,000 users" is dropped, not shown with a warning.
 */
export function checkRewrite(
  details: ProfileDetails,
  output: { id: string; after: string; tip: string }[],
): RewriteSuggestion[] {
  const targets = new Map(rewriteTargets(details).map((target) => [target.id, target]));
  const numbers = knownNumbers(details);
  const seen = new Set<string>();
  const suggestions: RewriteSuggestion[] = [];
  for (const item of output) {
    const target = targets.get(item.id);
    const after = item.after.replace(/\s+/g, " ").trim();
    if (!target || seen.has(item.id) || !after || after === target.text.trim() || after.length > 1500) continue;
    if ((after.match(/\d+(?:[.,]\d+)?/g) ?? []).some((number) => !numbers.has(number))) continue;
    seen.add(item.id);
    suggestions.push({ id: item.id, place: target.place, before: target.text, after, tip: item.tip.trim() || null });
  }
  return suggestions;
}
