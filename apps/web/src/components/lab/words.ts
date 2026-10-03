import type { Label, Level, ReachedDepth, Status } from "@ken-os/domain";
import type { PillTone } from "@/components/ui/pill";

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
  placement: "Placement check",
  checkpoint: "Checkpoint",
};

export function levelWords(level: Level | null) {
  return level === null ? "Not yet junior" : { junior: "Junior", mid: "Mid-level", senior: "Senior" }[level];
}

export const depthWords: Record<ReachedDepth, string> = {
  none: "Not yet",
  aware: "Aware",
  build: "Can build it",
  run: "Can run it",
};

export const radarTagWords: Record<string, string> = {
  learn: "Learn",
  experiment: "Experiment",
  explore: "Explore",
  recheck: "Re-check",
};

export const label = "text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground";

/** Which status colour a grade or status gets. The Pill always shows the words too, so meaning never depends on colour. */
export function toneFor(value: string): PillTone {
  if (value === "solid" || value === "VALIDATED") return "solid";
  if (value === "partial" || value === "rusty" || value === "LEARNING" || value === "PRACTICING") return "partial";
  if (value === "misconception" || value === "gap" || value === "NEEDS_REVISIT") return "gap";
  return "neutral";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}
