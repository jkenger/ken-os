import { AREAS, type Area, type TopicMap } from "./topics";

// Roles and levels from roles.yaml, and the chapters a role needs. The default roadmap is built from them until Claude
// plans one (docs/architecture/engineering-claude-first.md).

export const LEVELS = ["junior", "mid", "senior"] as const;
export type Level = (typeof LEVELS)[number];

/** How deep a chapter needs to go. "build" matches topic depth `working`; "run" also needs the `deep` topics. */
export const DEPTHS = ["aware", "build", "run"] as const;
export type Depth = (typeof DEPTHS)[number];

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
