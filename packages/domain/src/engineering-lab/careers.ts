import { AREAS, type Area, type TopicMap } from "./topics";

// Roles, levels and the Profile rules. Spec: docs/architecture/engineering-rebuild.md, section 5.
// Levels come only from Proven topics; the assessment never sets one.
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
  const knownSources = (value: unknown, where: string) =>
    list(value, where).map((id) => {
      const sourceId = text(id, where);
      if (!sourceIds.has(sourceId)) fail(where, `unknown source ${sourceId}`);
      return sourceId;
    });

  const levels = list(input.levels, "levels").map((value, index): LevelInfo => {
    const item = value as Record<string, unknown>;
    const where = `levels[${index}]`;
    return {
      id: oneOf(item.id, LEVELS, `${where}.id`),
      title: text(item.title, `${where}.title`),
      summary: text(item.summary, `${where}.summary`),
      sources: knownSources(item.sources, `${where}.sources`),
    };
  });
  if (levels.map((level) => level.id).join() !== LEVELS.join())
    fail("levels", `expected ${LEVELS.join(", ")} in order`);

  const chapters = new Map(map.chapters.map((module) => [module.id, module]));
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
    return {
      id,
      title: text(item.title, `${where}.title`),
      summary: text(item.summary, `${where}.summary`),
      levels: ladder,
    };
  });
  if (
    areas
      .map((area) => area.id)
      .sort()
      .join() !== [...AREAS].sort().join()
  )
    fail("areas", `expected each of ${AREAS.join(", ")} exactly once`);

  const roles = list(input.roles, "roles").map((value, index): RoleInfo => {
    const item = value as Record<string, unknown>;
    const where = `roles[${index}]`;
    const targets: RoleInfo["targets"] = {};
    for (const [area, level] of Object.entries((item.targets ?? {}) as Record<string, unknown>)) {
      targets[oneOf(area, AREAS, `${where}.targets`)] = oneOf(level, LEVELS, `${where}.targets.${area}`);
    }
    if (!Object.keys(targets).length) fail(where, "a role needs at least one area target");
    return {
      id: text(item.id, `${where}.id`),
      title: text(item.title, `${where}.title`),
      summary: text(item.summary, `${where}.summary`),
      targets,
    };
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
    definitions: {
      developer: text(definitions.developer, "definitions.developer"),
      engineer: text(definitions.engineer, "definitions.engineer"),
    },
    levels,
    areas,
    roles,
    sources,
  };
}

/** The topics a requirement counts, and how many of them must be proven. */
export interface RequiredSlots {
  chapter: string;
  depth: Depth;
  topicIds: string[];
  need: number;
}

/**
 * aware: any one topic of the chapter proven. build: every `working` topic proven (every topic, if none is `working`).
 * run: every topic proven, the `deep` ones included.
 */
export function slotsFor(map: TopicMap, requirement: Requirement): RequiredSlots {
  const topics = map.topics.filter((topic) => topic.chapter === requirement.chapter);
  if (requirement.depth === "aware")
    return { ...requirement, topicIds: topics.map((topic) => topic.id), need: Math.min(1, topics.length) };
  const working = topics.filter((topic) => topic.depth === "working");
  const counted = requirement.depth === "run" || !working.length ? topics : working;
  return { ...requirement, topicIds: counted.map((topic) => topic.id), need: counted.length };
}

/** How many of a requirement's needed topics are proven. */
export function provenIn(slots: RequiredSlots, proven: ReadonlySet<string>) {
  return Math.min(slots.need, slots.topicIds.filter((id) => proven.has(id)).length);
}

/** The deepest depth a chapter has reached, from proven topics only. */
export function chapterDepth(map: TopicMap, chapter: string, proven: ReadonlySet<string>): ReachedDepth {
  for (const depth of [...DEPTHS].reverse()) {
    const slots = slotsFor(map, { chapter, depth });
    if (slots.need > 0 && provenIn(slots, proven) >= slots.need) return depth;
  }
  return "none";
}

/** Every requirement up to and including a level, keeping the deepest depth asked for each chapter. */
export function requirementsUpTo(ladder: AreaLadder, level: Level): Requirement[] {
  const merged = new Map<string, Depth>();
  for (const step of LEVELS.slice(0, LEVELS.indexOf(level) + 1)) {
    for (const requirement of ladder.levels[step]) {
      const current = merged.get(requirement.chapter);
      if (!current || DEPTHS.indexOf(requirement.depth) > DEPTHS.indexOf(current))
        merged.set(requirement.chapter, requirement.depth);
    }
  }
  return [...merged].map(([chapter, depth]) => ({ chapter, depth }));
}

export function levelRank(level: Level | null) {
  return level === null ? -1 : LEVELS.indexOf(level);
}

/** Proven over needed, across a set of requirements. */
export interface Coverage {
  proven: number;
  required: number;
}

export function coverageOf(map: TopicMap, requirements: Requirement[], proven: ReadonlySet<string>): Coverage {
  const slots = requirements.map((requirement) => slotsFor(map, requirement));
  return {
    proven: slots.reduce((sum, slot) => sum + provenIn(slot, proven), 0),
    required: slots.reduce((sum, slot) => sum + slot.need, 0),
  };
}

/** The highest level whose requirements are all met, from proven topics only. Null means Developing. */
export function evidenceLevel(map: TopicMap, ladder: AreaLadder, proven: ReadonlySet<string>): Level | null {
  let level: Level | null = null;
  for (const step of LEVELS) {
    const { proven: have, required } = coverageOf(map, requirementsUpTo(ladder, step), proven);
    if (required === 0 || have < required) break;
    level = step;
  }
  return level;
}

/** The topics still needed for a set of requirements, in course order. An aware requirement asks for its first topic. */
export function missingTopics(map: TopicMap, requirements: Requirement[], proven: ReadonlySet<string>): string[] {
  const missing = new Set<string>();
  for (const requirement of requirements) {
    const slots = slotsFor(map, requirement);
    if (provenIn(slots, proven) >= slots.need) continue;
    const open = slots.topicIds.filter((id) => !proven.has(id));
    for (const id of requirement.depth === "aware" ? open.slice(0, 1) : open) missing.add(id);
  }
  return map.topics.map((topic) => topic.id).filter((id) => missing.has(id));
}

export interface AreaRow {
  area: Area;
  /** Null: Developing. */
  level: Level | null;
  /** The level the target role needs here, or null when the role doesn't need this area. */
  target: Level | null;
  /** Proven required topics over required topics, for the target level. Zero over zero without a target. */
  coverage: Coverage;
  /** Required topics for the target that aren't proven yet, in course order. */
  remaining: string[];
}

/** One row per area for the Profile table. */
export function areaRows(
  map: TopicMap,
  careers: Careers,
  role: RoleInfo | null,
  proven: ReadonlySet<string>,
): AreaRow[] {
  return careers.areas.map((ladder) => {
    const target = role?.targets[ladder.id] ?? null;
    const requirements = target ? requirementsUpTo(ladder, target) : [];
    return {
      area: ladder.id,
      level: evidenceLevel(map, ladder, proven),
      target,
      coverage: coverageOf(map, requirements, proven),
      remaining: missingTopics(map, requirements, proven),
    };
  });
}

/** The overall level for a role: the weakest of its required areas. Null when any of them is still Developing. */
export function overallLevel(rows: AreaRow[]): Level | null {
  const needed = rows.filter((row) => row.target);
  if (!needed.length) return null;
  return needed.reduce<Level | null>(
    (low, row) => (levelRank(row.level) < levelRank(low) ? row.level : low),
    needed[0].level,
  );
}

export interface Milestone {
  area: Area;
  level: Level;
  coverage: Coverage;
  /** The next topic to prove for it. */
  topicId: string;
}

/**
 * The next milestone: of the areas below their target, the next level up that is closest to done. Ties go to the area
 * earlier in the course. Null when every target is met.
 */
export function nextMilestone(
  map: TopicMap,
  careers: Careers,
  role: RoleInfo,
  proven: ReadonlySet<string>,
): Milestone | null {
  let best: (Milestone & { ratio: number }) | null = null;
  for (const ladder of careers.areas) {
    const target = role.targets[ladder.id];
    if (!target) continue;
    const current = evidenceLevel(map, ladder, proven);
    if (levelRank(current) >= levelRank(target)) continue;
    const level = LEVELS[levelRank(current) + 1];
    const requirements = requirementsUpTo(ladder, level);
    const coverage = coverageOf(map, requirements, proven);
    const topicId = missingTopics(map, requirements, proven)[0];
    if (!topicId) continue;
    const ratio = coverage.required ? coverage.proven / coverage.required : 0;
    if (!best || ratio > best.ratio) best = { area: ladder.id, level, coverage, topicId, ratio };
  }
  if (!best) return null;
  return { area: best.area, level: best.level, coverage: best.coverage, topicId: best.topicId };
}

/** The chapters a role needs at any level up to its targets. */
export function chaptersForRole(careers: Careers, role: RoleInfo): Set<string> {
  const chapters = new Set<string>();
  for (const ladder of careers.areas) {
    const target = role.targets[ladder.id];
    if (target) for (const requirement of requirementsUpTo(ladder, target)) chapters.add(requirement.chapter);
  }
  return chapters;
}

/**
 * My path: only the chapters the role needs, weakest area first, then course order. Area scores come from the
 * assessment, lower is weaker; an area without a score sorts after the scored ones, in course order.
 */
export function pathChapters(
  map: TopicMap,
  careers: Careers,
  role: RoleInfo,
  areaScores: Partial<Record<Area, number>>,
): string[] {
  const needed = chaptersForRole(careers, role);
  const order = (area: Area) => areaScores[area] ?? Number.POSITIVE_INFINITY;
  return map.chapters
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) => needed.has(chapter.id))
    .sort(
      (a, b) =>
        order(a.chapter.area) - order(b.chapter.area) ||
        AREAS.indexOf(a.chapter.area) - AREAS.indexOf(b.chapter.area) ||
        a.index - b.index,
    )
    .map(({ chapter }) => chapter.id);
}
