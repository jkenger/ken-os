import { SOURCE_DOMAINS, type SourceGroup } from "./sources";
import { AREAS, type Area } from "./topics";

// Shapes for the intake, daily practice and the radar. Spec: docs/architecture/engineering-rebuild.md.

/** The intake: three answers before the assessment. Never graded, never evidence. */
export interface IntakeAnswers {
  /** What you're building. */
  building: string;
  /** The role you're aiming for, a role id from roles.yaml. */
  role: string;
  weeklyHours: number;
}

export const WEEKLY_HOURS = { min: 1, max: 40 } as const;

export const RADAR_TAGS = ["learn", "experiment", "explore", "recheck"] as const;
export type RadarTag = (typeof RADAR_TAGS)[number];

/** Where the radar may look for each area: official docs, release notes and changelogs only. */
export const RADAR_SOURCE_GROUPS: Record<Area, SourceGroup[]> = {
  foundations: ["javascript", "web"],
  frontend: ["react", "web"],
  backend: ["database", "web"],
  production: ["operations", "web"],
  ai: ["ai"],
};

export function radarDomains(areas: Area[]): string[] {
  return [...new Set(areas.flatMap((area) => RADAR_SOURCE_GROUPS[area].flatMap((group) => SOURCE_DOMAINS[group])))];
}

/** Radar items a week may hold, not counting automatic re-check flags. */
export const RADAR_WEEKLY_LIMIT = 5;

/** One item of a day's practice. The question is written when the set is made. */
export interface DailyItem {
  topicId: string;
  reason: "due" | "changed" | "misconception" | "active";
  questionId: string;
}

/** ISO week, like 2026-W40, so a radar run belongs to exactly one week. */
export function isoWeek(date: Date): string {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function isArea(value: unknown): value is Area {
  return typeof value === "string" && (AREAS as readonly string[]).includes(value);
}
