import { SOURCE_DOMAINS, type SourceGroup } from "./sources";
import { AREAS, type Area } from "./topics";

// Shapes for the career profile, the Guide conversation, daily practice and the radar.
// Design: docs/architecture/engineering-lab-profile.md, sections 3, 5, 6 and 7.

/** What the intake records. It steers where questions start and the first pace estimate, and is never evidence. */
export interface IntakeAnswers {
  building: string;
  stack: string;
  aiWork: string;
  weeklyHours: number;
}

export interface GuideMessage {
  role: "owner" | "guide";
  text: string;
  at: string;
}

/** A chapter the Guide suggested and the owner approved. It joins the outline unwritten. */
export interface AddedChapter {
  id: string;
  title: string;
  area: Area;
  reason: string;
  addedAt: string;
}

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

export type DailyItem =
  | { type: "question"; topicId: string; assessmentId: string; itemIndex: number }
  | { type: "lab"; topicId: string; labId: string };

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

/** A stable id for an added chapter from its title, prefixed so it can never clash with a course chapter. */
export function addedChapterId(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return `added-${slug || "chapter"}`;
}
