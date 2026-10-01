import type { Label, Status } from "@ken-os/domain";

// Screen wording for codes. The UI says what a person would say, not the internal status names.

export const statusWords: Record<Status, string> = {
  NOT_STARTED: "Not started",
  LEARNING: "Learning",
  PRACTICING: "Practicing",
  VALIDATED: "Proven",
  NEEDS_REVISIT: "Needs another look",
};

export const labelWords: Record<Label, string> = {
  solid: "Solid",
  partial: "Partly there",
  rusty: "Rusty",
  misconception: "Misconception",
  gap: "Gap",
};

export const modeWords: Record<string, string> = {
  explain: "Explain it",
  predict: "Predict the output",
  debug: "Find and fix the bug",
  implement: "Build it",
  review: "Review code",
  design: "Design a solution",
};

export const kindWords: Record<string, string> = {
  baseline: "Baseline",
  lesson: "Lesson practice",
  lab: "Lab",
  assessment: "Check",
  review: "Review",
};

export const label = "text-[11px] font-bold tracking-[0.15em] text-muted-foreground";

/** Strong text for solid and proven, muted for everything else. Meaning never depends on color alone. */
export function toneFor(value: string) {
  if (value === "solid" || value === "VALIDATED") return "bg-primary text-primary-foreground";
  if (value === "misconception" || value === "gap" || value === "NEEDS_REVISIT") return "border border-foreground/60 text-foreground";
  return "bg-muted text-foreground";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}
