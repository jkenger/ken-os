import { isKnown, type TopicProgress } from "./mastery";
import { AREAS, type Area, type ModuleInfo, type TopicMap } from "./topics";
import { stageOne } from "./runs";
import type { Label } from "./types";

// Roles, levels and the career profile. Design: docs/architecture/engineering-lab-profile.md, section 2.
// Everything here is plain rules over progress, so the profile can be tested without a database or a browser.

export const LEVELS = ["junior", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];

/** How deep a chapter needs to go. "build" matches topic depth `working`; "run" also needs the `deep` topics. */
export const DEPTHS = ["aware", "build", "run"] as const;
export type Depth = (typeof DEPTHS)[number];
export type ReachedDepth = "none" | Depth;

export interface Requirement {
  chapter: string;
  depth: Depth;
}

export interface LevelInfo {
  id: Level;
  title: string;
  /** What someone at this level can be trusted to own without help. */
  summary: string;
  sources: string[];
}

export interface AreaLadder {
  id: Area;
  title: string;
  summary: string;
  /** What each level needs in this area, beyond the levels below it. */
  levels: Record<Level, Requirement[]>;
}

export interface RoleInfo {
  id: string;
  title: string;
  summary: string;
  /** The level the role needs in each area it cares about. Areas left out don't count toward it. */
  targets: Partial<Record<Area, Level>>;
}

export interface CareerSource {
  id: string;
  title: string;
  url: string;
}

export interface Careers {
  /** Draft until the owner approves the definitions. The profile says so while it's a draft. */
  status: "draft" | "approved";
  approvedOn: string | null;
  note: string;
  definitions: { developer: string; engineer: string };
  levels: LevelInfo[];
  areas: AreaLadder[];
  roles: RoleInfo[];
  sources: CareerSource[];
}

const DEPTH_ORDER: ReachedDepth[] = ["none", "aware", "build", "run"];

export function depthAtLeast(have: ReachedDepth, need: Depth) {
  return DEPTH_ORDER.indexOf(have) >= DEPTH_ORDER.indexOf(need);
}

function fail(where: string, message: string): never {
  throw new Error(`${where}: ${message}`);
}

function text(value: unknown, where: string): string {
  if (typeof value !== "string" || !value.trim()) fail(where, "expected text");
  return value.trim();
}

function oneOf<T extends string>(value: unknown, options: readonly T[], where: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) fail(where, `expected one of ${options.join(", ")}`);
  return value as T;
}

function list(value: unknown, where: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(where, "expected a list");
  return value;
}

/** Validates roles.yaml against the topic map: known chapters in the right area, known sources, every area once. */
export function parseCareers(raw: unknown, map: TopicMap): Careers {
  if (!raw || typeof raw !== "object") fail("roles.yaml", "expected status, levels, areas, roles and sources");
  const input = raw as Record<string, unknown>;
  const sources = list(input.sources, "sources").map((value, index): CareerSource => {
    const item = value as Record<string, unknown>;
    const url = text(item.url, `sources[${index}].url`);
    if (!url.startsWith("https://")) fail(`sources[${index}]`, "url must be https");
    return { id: text(item.id, `sources[${index}].id`), title: text(item.title, `sources[${index}].title`), url };
  });
  const sourceIds = new Set(sources.map((source) => source.id));
  const knownSources = (value: unknown, where: string) => list(value, where).map((id) => {
    const sourceId = text(id, where);
    if (!sourceIds.has(sourceId)) fail(where, `unknown source ${sourceId}`);
    return sourceId;
  });

  const levels = list(input.levels, "levels").map((value, index): LevelInfo => {
    const item = value as Record<string, unknown>;
    const where = `levels[${index}]`;
    return { id: oneOf(item.id, LEVELS, `${where}.id`), title: text(item.title, `${where}.title`), summary: text(item.summary, `${where}.summary`), sources: knownSources(item.sources, `${where}.sources`) };
  });
  if (levels.map((level) => level.id).join() !== LEVELS.join()) fail("levels", `expected ${LEVELS.join(", ")} in order`);

  const chapters = new Map(map.modules.map((module) => [module.id, module]));
  const areas = list(input.areas, "areas").map((value, index): AreaLadder => {
    const item = value as Record<string, unknown>;
    const where = `areas[${index}]`;
    const id = oneOf(item.id, AREAS, `${where}.id`);
    const rawLevels = (item.levels ?? {}) as Record<string, unknown>;
    const ladder = {} as Record<Level, Requirement[]>;
    for (const level of LEVELS) {
      ladder[level] = list(rawLevels[level], `${where}.levels.${level}`).map((entry, entryIndex): Requirement => {
        const requirement = entry as Record<string, unknown>;
        const at = `${where}.levels.${level}[${entryIndex}]`;
        const chapter = text(requirement.chapter, `${at}.chapter`);
        const module = chapters.get(chapter);
        if (!module) fail(at, `unknown chapter ${chapter}`);
        if (module.area !== id) fail(at, `chapter ${chapter} belongs to ${module.area}, not ${id}`);
        return { chapter, depth: oneOf(requirement.depth, DEPTHS, `${at}.depth`) };
      });
    }
    return { id, title: text(item.title, `${where}.title`), summary: text(item.summary, `${where}.summary`), levels: ladder };
  });
  if (areas.map((area) => area.id).sort().join() !== [...AREAS].sort().join()) fail("areas", `expected each of ${AREAS.join(", ")} exactly once`);

  const roles = list(input.roles, "roles").map((value, index): RoleInfo => {
    const item = value as Record<string, unknown>;
    const where = `roles[${index}]`;
    const targets: RoleInfo["targets"] = {};
    for (const [area, level] of Object.entries((item.targets ?? {}) as Record<string, unknown>)) {
      targets[oneOf(area, AREAS, `${where}.targets`)] = oneOf(level, LEVELS, `${where}.targets.${area}`);
    }
    if (!Object.keys(targets).length) fail(where, "a role needs at least one area target");
    return { id: text(item.id, `${where}.id`), title: text(item.title, `${where}.title`), summary: text(item.summary, `${where}.summary`), targets };
  });
  if (new Set(roles.map((role) => role.id)).size !== roles.length) fail("roles", "duplicate role id");

  const status = oneOf(input.status, ["draft", "approved"] as const, "status");
  const approvedOn = input.approvedOn ? text(input.approvedOn, "approvedOn") : null;
  if (status === "approved" && !approvedOn) fail("approvedOn", "an approved file needs the approval date");
  const definitions = (input.definitions ?? {}) as Record<string, unknown>;
  return {
    status,
    approvedOn,
    note: text(input.note, "note"),
    definitions: { developer: text(definitions.developer, "definitions.developer"), engineer: text(definitions.engineer, "definitions.engineer") },
    levels,
    areas,
    roles,
    sources,
  };
}

/** Labels from a chapter's screening questions, for chapters with no written topics. Voided answers left out. */
export interface ChapterScreen {
  chapterId: string;
  labels: Label[];
}

export interface ChapterState {
  chapterId: string;
  area: Area;
  depth: ReachedDepth;
  /** True when the depth rests on screening answers, or the chapter still has topics that aren't written. */
  estimate: boolean;
  written: number;
  known: number;
  planned: number;
}

const SCREEN_SCORE: Record<Label, number> = { solid: 2, partial: 1, rusty: 1, misconception: 0, gap: 0 };

/** How deep each chapter goes right now, from proofs and placements, or from screening answers when unwritten. */
export function chapterStates(map: TopicMap, progress: TopicProgress[], screens: ChapterScreen[], extraChapters: ModuleInfo[] = []): ChapterState[] {
  const byTopic = new Map(progress.map((item) => [item.topicId, item]));
  return [...map.modules, ...extraChapters].map((module) => {
    const topics = map.topics.filter((topic) => topic.module === module.id);
    if (!topics.length) {
      const labels = screens.filter((screen) => screen.chapterId === module.id).flatMap((screen) => screen.labels);
      const score = labels.reduce((sum, label) => sum + SCREEN_SCORE[label], 0);
      // Screening never shows "can run it": two questions can't show you keep something working in production.
      const depth: ReachedDepth = labels.length >= 2 && score >= 4 ? "build" : score >= 2 ? "aware" : "none";
      return { chapterId: module.id, area: module.area, depth, estimate: true, written: 0, known: 0, planned: module.planned.length };
    }
    const known = topics.filter((topic) => { const item = byTopic.get(topic.id); return item ? isKnown(item) : false; });
    const knownIds = new Set(known.map((topic) => topic.id));
    const working = topics.filter((topic) => topic.depth === "working");
    const allKnown = known.length === topics.length;
    const workingKnown = working.length ? working.every((topic) => knownIds.has(topic.id)) : allKnown;
    const someSense = topics.some((topic) => {
      const item = byTopic.get(topic.id);
      if (!item) return false;
      if (isKnown(item) || ["solid", "partial", "rusty"].includes(item.baselineLabel ?? "")) return true;
      return Object.values(item.evidence).some((evidence) => evidence && ["solid", "partial", "rusty"].includes(evidence.label));
    });
    const fromTopics: ReachedDepth = allKnown ? "run" : workingKnown ? "build" : someSense ? "aware" : "none";
    // A chapter cleared in stage 1 of a two-stage assessment counts as "can build it", as an estimate, until its topics
    // are proven or placed. It never lowers what the topics already show.
    const labels = screens.filter((screen) => screen.chapterId === module.id).flatMap((screen) => screen.labels);
    const cleared = stageOne(labels) === "cleared" && (fromTopics === "none" || fromTopics === "aware");
    const depth: ReachedDepth = cleared ? "build" : fromTopics;
    return { chapterId: module.id, area: module.area, depth, estimate: module.planned.length > 0 || cleared, written: topics.length, known: known.length, planned: module.planned.length };
  });
}

/** Every requirement up to and including a level, keeping the deepest depth asked for each chapter. */
export function requirementsUpTo(ladder: AreaLadder, level: Level): Requirement[] {
  const merged = new Map<string, Depth>();
  for (const step of LEVELS.slice(0, LEVELS.indexOf(level) + 1)) {
    for (const requirement of ladder.levels[step]) {
      const current = merged.get(requirement.chapter);
      if (!current || DEPTHS.indexOf(requirement.depth) > DEPTHS.indexOf(current)) merged.set(requirement.chapter, requirement.depth);
    }
  }
  return [...merged].map(([chapter, depth]) => ({ chapter, depth }));
}

export interface MissingChapter {
  chapter: string;
  area: Area;
  need: Depth;
  have: ReachedDepth;
}

export interface AreaLevel {
  area: Area;
  /** Null until every junior requirement is met. */
  level: Level | null;
  estimate: boolean;
  /** The next level up and what it still needs. Null at senior. */
  next: null | {
    level: Level;
    /** Requirements this step adds over the current level (new chapters, or deeper ones), and how many are met. */
    met: number;
    total: number;
    missing: MissingChapter[];
  };
}

export function areaLevel(ladder: AreaLadder, states: ChapterState[]): AreaLevel {
  const state = (chapter: string) => states.find((item) => item.chapterId === chapter);
  let level: Level | null = null;
  let estimate = false;
  for (const step of LEVELS) {
    const requirements = requirementsUpTo(ladder, step);
    const missing = requirements.filter((requirement) => !depthAtLeast(state(requirement.chapter)?.depth ?? "none", requirement.depth));
    if (missing.length) {
      const below = level ? requirementsUpTo(ladder, level) : [];
      const added = requirements.filter((requirement) => !below.some((item) => item.chapter === requirement.chapter && DEPTHS.indexOf(item.depth) >= DEPTHS.indexOf(requirement.depth)));
      return {
        area: ladder.id,
        level,
        estimate,
        next: {
          level: step,
          met: added.length - missing.length,
          total: added.length,
          missing: missing.map((requirement) => ({ chapter: requirement.chapter, area: ladder.id, need: requirement.depth, have: state(requirement.chapter)?.depth ?? "none" })),
        },
      };
    }
    level = step;
    estimate = estimate || requirements.some((requirement) => state(requirement.chapter)?.estimate);
  }
  return { area: ladder.id, level, estimate, next: null };
}

export function levelRank(level: Level | null) {
  return level === null ? -1 : LEVELS.indexOf(level);
}

export interface RoleDistance {
  roleId: string;
  /** The role's areas: what it needs and where you are. */
  areas: { area: Area; target: Level; current: Level | null; estimate: boolean }[];
  /** Your level for this role: the lowest of its areas, so one weak area caps it. */
  overall: Level | null;
  missing: MissingChapter[];
}

export function roleDistance(role: RoleInfo, careers: Careers, states: ChapterState[]): RoleDistance {
  const state = (chapter: string) => states.find((item) => item.chapterId === chapter);
  const areas = (Object.entries(role.targets) as [Area, Level][]).map(([area, target]) => {
    const current = areaLevel(careers.areas.find((item) => item.id === area)!, states);
    return { area, target, current: current.level, estimate: current.estimate };
  });
  const missing: MissingChapter[] = [];
  for (const { area, target } of areas) {
    const ladder = careers.areas.find((item) => item.id === area)!;
    for (const requirement of requirementsUpTo(ladder, target)) {
      const have = state(requirement.chapter)?.depth ?? "none";
      if (!depthAtLeast(have, requirement.depth)) missing.push({ chapter: requirement.chapter, area, need: requirement.depth, have });
    }
  }
  const lowest = areas.reduce<Level | null | undefined>((low, item) => low === undefined || levelRank(item.current) < levelRank(low) ? item.current : low, undefined);
  return { roleId: role.id, areas, overall: lowest ?? null, missing };
}

export interface RoadmapStep extends MissingChapter {
  /** The lowest level of the role that needs this chapter at this depth. */
  forLevel: Level;
  hours: number;
  /** Weeks from now until this step should be done, at the given pace. */
  doneByWeek: number;
}

const HOURS = { working: 3, deep: 5, planned: 4, aware: 1 } as const;

/**
 * The role's missing chapters in learning order, as stages: a chapter the role needs at "can run it" shows up first at
 * the depth its lowest level needs, then again where a higher level needs it deeper. Order: what the lowest level
 * needs first, foundations before the areas built on them, then course order. Pace is an estimate from hours per
 * week, or from real history when there is some.
 */
export function roadmap(role: RoleInfo, careers: Careers, states: ChapterState[], map: TopicMap, progress: TopicProgress[], weeklyHours: number, hoursPerTopic?: number): RoadmapStep[] {
  const known = new Set(progress.filter(isKnown).map((item) => item.topicId));
  const moduleOrder = new Map(map.modules.map((module, index) => [module.id, index]));
  const state = (chapter: string) => states.find((item) => item.chapterId === chapter);
  const stages: (MissingChapter & { forLevel: Level })[] = [];
  for (const [area, target] of Object.entries(role.targets) as [Area, Level][]) {
    const ladder = careers.areas.find((item) => item.id === area)!;
    for (const level of LEVELS.slice(0, LEVELS.indexOf(target) + 1)) {
      for (const requirement of requirementsUpTo(ladder, level)) {
        const have = state(requirement.chapter)?.depth ?? "none";
        if (depthAtLeast(have, requirement.depth)) continue;
        if (stages.some((stage) => stage.chapter === requirement.chapter && DEPTHS.indexOf(stage.need) >= DEPTHS.indexOf(requirement.depth))) continue;
        stages.push({ chapter: requirement.chapter, area, need: requirement.depth, have, forLevel: level });
      }
    }
  }
  stages.sort((a, b) => LEVELS.indexOf(a.forLevel) - LEVELS.indexOf(b.forLevel)
    || AREAS.indexOf(a.area) - AREAS.indexOf(b.area)
    || (moduleOrder.get(a.chapter) ?? 99) - (moduleOrder.get(b.chapter) ?? 99));
  const perWeek = Math.max(1, weeklyHours);
  let total = 0;
  return stages.map((stage, index) => {
    const module = map.modules.find((entry) => entry.id === stage.chapter);
    const earlier = stages.slice(0, index).filter((item) => item.chapter === stage.chapter);
    // A deeper stage only counts what the earlier stage of the same chapter didn't.
    const builtBefore = earlier.some((item) => item.need === "build");
    const plannedBefore = earlier.some((item) => item.need !== "aware");
    const topics = map.topics.filter((topic) => topic.module === stage.chapter && !known.has(topic.id)
      && (stage.need === "run" ? !builtBefore || topic.depth === "deep" : topic.depth === "working"));
    let hours = stage.need === "aware"
      ? HOURS.aware
      : topics.reduce((sum, topic) => sum + (hoursPerTopic ?? HOURS[topic.depth]), 0) + (plannedBefore ? 0 : (module?.planned.length ?? 0) * (hoursPerTopic ?? HOURS.planned));
    hours = Math.max(Math.round(hours * 10) / 10, 1);
    total += hours;
    // The have of a later stage is what the earlier stage leaves you with.
    const have = earlier.length ? earlier[earlier.length - 1].need : stage.have;
    return { ...stage, have, hours, doneByWeek: Math.ceil(total / perWeek) };
  });
}

/**
 * Hours a topic really takes, from history: average days from first answer to proven, times hours per day.
 * Null until three topics are proven, so a single quick topic can't set the pace.
 */
export function measuredHoursPerTopic(spans: { firstAt: string; provenAt: string }[], weeklyHours: number): number | null {
  if (spans.length < 3) return null;
  const days = spans.reduce((sum, span) => sum + Math.max(1, (new Date(span.provenAt).getTime() - new Date(span.firstAt).getTime()) / 86_400_000), 0) / spans.length;
  return Math.round(days * (weeklyHours / 7) * 10) / 10;
}
