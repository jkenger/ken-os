import {
  areaLevel, DEPTHS, depthAtLeast, isKnown, LEVELS, levelRank, requirementsUpTo,
  type Area, type Careers, type ChapterState, type Depth, type Level, type ReachedDepth, type Status, type TopicMap, type TopicProgress,
} from "@ken-os/domain";

// The Profile page's capability table: one row per area, each opening into the chapters its next level or the chosen
// direction needs. Plain rules over the same progress and chapter states the rest of the module uses, so the table can
// never disagree with levels, the roadmap or the Planner.
// Design: docs/architecture/engineering-redesign.md (Profile), engineering-lab-profile.md section 2.

export type KnownOrigin = "proof" | "placement" | null;

export interface RequirementTopic {
  topicId: string;
  title: string;
  status: Status;
  /** How the topic became known: a proof, or a passed placement-style sitting. Null while it isn't known. */
  origin: KnownOrigin;
  /** The requirement needs this topic: every topic for "can run it", the working-depth ones for "can build it". */
  needed: boolean;
}

export interface RequirementRow {
  chapterId: string;
  title: string;
  /** The level that first asks for this chapter at this depth. */
  level: Level;
  need: Depth;
  have: ReachedDepth;
  met: boolean;
  estimate: boolean;
  topics: RequirementTopic[];
  /** Needed topics that aren't known yet, in course order. */
  missing: string[];
}

export interface CapabilityRow {
  area: Area;
  title: string;
  summary: string;
  current: Level | null;
  estimate: boolean;
  /** What the chosen direction needs here. Null when there's no direction or the direction doesn't use this area. */
  target: Level | null;
  atBaseline: Level | null;
  /** The level the requirements below lead to: the target, or the next level up when there's no target. */
  scope: Level | null;
  requirements: RequirementRow[];
  remaining: number;
}

export interface NextRequirement {
  area: Area;
  areaTitle: string;
  requirement: RequirementRow;
  topicId: string | null;
}

function originOf(progress: TopicProgress | undefined): KnownOrigin {
  if (!progress) return null;
  if (progress.status === "VALIDATED") return "proof";
  return isKnown(progress) ? "placement" : null;
}

/** The lowest level whose cumulative requirements ask for this chapter at least this deep. */
function introducedAt(careers: Careers, area: Area, chapter: string, depth: Depth): Level {
  const ladder = careers.areas.find((item) => item.id === area)!;
  return LEVELS.find((level) => requirementsUpTo(ladder, level).some((item) => item.chapter === chapter && DEPTHS.indexOf(item.depth) >= DEPTHS.indexOf(depth))) ?? "senior";
}

export function capabilityRows(input: {
  careers: Careers;
  map: TopicMap;
  progress: TopicProgress[];
  states: ChapterState[];
  baselineStates?: ChapterState[] | null;
  roleId: string | null;
  /** Titles for chapters the owner added, which aren't in the topic map. */
  extraTitles?: Record<string, string>;
}): CapabilityRow[] {
  const { careers, map, progress, states } = input;
  const role = careers.roles.find((item) => item.id === input.roleId) ?? null;
  const byTopic = new Map(progress.map((item) => [item.topicId, item]));
  const state = (chapter: string) => states.find((item) => item.chapterId === chapter);

  return careers.areas.map((ladder) => {
    const now = areaLevel(ladder, states);
    const target = role?.targets[ladder.id] ?? null;
    const scope = target ?? now.next?.level ?? null;
    const requirements = scope ? requirementsUpTo(ladder, scope).map((requirement): RequirementRow => {
      const chapterState = state(requirement.chapter);
      const have = chapterState?.depth ?? "none";
      const topics = map.topics.filter((topic) => topic.module === requirement.chapter);
      const working = topics.filter((topic) => topic.depth === "working");
      const neededIds = new Set((requirement.depth === "run" || !working.length ? topics : working).map((topic) => topic.id));
      const rows = topics.map((topic): RequirementTopic => {
        const item = byTopic.get(topic.id);
        return { topicId: topic.id, title: topic.title, status: item?.status ?? "NOT_STARTED", origin: originOf(item), needed: requirement.depth !== "aware" && neededIds.has(topic.id) };
      });
      const met = depthAtLeast(have, requirement.depth);
      return {
        chapterId: requirement.chapter,
        title: map.modules.find((module) => module.id === requirement.chapter)?.title ?? input.extraTitles?.[requirement.chapter] ?? requirement.chapter,
        level: introducedAt(careers, ladder.id, requirement.chapter, requirement.depth),
        need: requirement.depth,
        have,
        met,
        estimate: chapterState?.estimate ?? false,
        topics: rows,
        missing: met ? [] : rows.filter((topic) => topic.needed && !topic.origin).map((topic) => topic.topicId),
      };
    }).sort((a, b) => levelRank(a.level) - levelRank(b.level)) : [];
    return {
      area: ladder.id,
      title: ladder.title,
      summary: ladder.summary,
      current: now.level,
      estimate: now.estimate,
      target,
      atBaseline: input.baselineStates ? areaLevel(ladder, input.baselineStates).level : null,
      scope,
      requirements,
      remaining: requirements.filter((item) => !item.met).length,
    };
  });
}

/** The chapters a direction asks for at any depth, for Learn's "My path". Null without a direction. */
export function pathChapters(careers: Careers, roleId: string | null): string[] | null {
  const role = careers.roles.find((item) => item.id === roleId);
  if (!role) return null;
  const chapters = new Set<string>();
  for (const [area, target] of Object.entries(role.targets) as [Area, Level][]) {
    const ladder = careers.areas.find((item) => item.id === area);
    if (ladder) for (const requirement of requirementsUpTo(ladder, target)) chapters.add(requirement.chapter);
  }
  return [...chapters];
}

/**
 * The next milestone: the first unmet requirement at the lowest level, across the areas the direction uses (or every
 * area without one), and the first topic it still needs.
 */
export function nextRequirement(rows: CapabilityRow[], roleId: string | null): NextRequirement | null {
  const candidates = rows
    .filter((row) => !roleId || row.target !== null)
    .flatMap((row) => row.requirements.filter((item) => !item.met).map((requirement) => ({ row, requirement })))
    .sort((a, b) => levelRank(a.requirement.level) - levelRank(b.requirement.level));
  const first = candidates[0];
  if (!first) return null;
  return { area: first.row.area, areaTitle: first.row.title, requirement: first.requirement, topicId: first.requirement.missing[0] ?? null };
}
