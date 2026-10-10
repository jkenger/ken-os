import type { Label, Level, ReachedDepth, TopicState } from "@ken-os/domain";
import type { PillTone } from "@/components/ui/pill";

// Screen wording for codes. The UI says what a person would say, not the internal status names.

export const statusWords: Record<TopicState, string> = {
  NOT_STARTED: "Not started",
  LEARNING: "Learning",
  PRACTICING: "Practicing",
  PROVEN: "Proven",
};

export const labelWords: Record<Label, string> = {
  solid: "Solid",
  partial: "Partly there",
  rusty: "Rusty",
  misconception: "Misconception",
  gap: "Gap",
};

export function levelWords(level: Level | null) {
  return level === null ? "Developing" : { junior: "Junior", mid: "Mid-level", senior: "Senior" }[level];
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
  if (value === "solid" || value === "PROVEN") return "solid";
  if (value === "partial" || value === "rusty" || value === "LEARNING" || value === "PRACTICING") return "partial";
  if (value === "misconception" || value === "gap") return "gap";
  return "neutral";
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}
