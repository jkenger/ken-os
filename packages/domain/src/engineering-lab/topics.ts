import { SOURCE_DOMAINS, type FreshnessClass, type SourceGroup } from "./sources";
import { MODES, type Mode } from "./types";

/** The five areas a level is measured in. Every chapter belongs to one. */
export const AREAS = ["foundations", "frontend", "backend", "production", "ai"] as const;
export type Area = (typeof AREAS)[number];

export interface AreaInfo {
  id: Area;
  title: string;
  /** Chapter ids in course order. */
  chapters: string[];
}

/** A chapter of the course, in one area. */
export interface ChapterInfo {
  id: string;
  title: string;
  area: Area;
}

export interface Topic {
  id: string;
  title: string;
  chapter: string;
  requires: string[];
  freshness: FreshnessClass;
  sourceGroups: SourceGroup[];
  /** What the topic repairs: the wrong belief or missing piece it targets. */
  gap: string;
  depth: "working" | "deep";
  /** Modes the topic is checked in: at least one rests on code, through predict or its exercise. */
  prove: Mode[];
  labs: string[];
  /** What a solid answer must show, 4 to 6 short statements. The Assessor writes questions and rubrics from them. */
  points: string[];
}

export interface TopicMap {
  areas: AreaInfo[];
  /** Every chapter in course order, area by area. */
  chapters: ChapterInfo[];
  /** Every topic in course order, chapter by chapter. */
  topics: Topic[];
}

const FRESHNESS: FreshnessClass[] = ["core_concept", "web_platform", "framework", "ai_ecosystem"];

function fail(where: string, message: string): never {
  throw new Error(`${where}: ${message}`);
}

function text(value: unknown, where: string, min = 1): string {
  if (typeof value !== "string" || value.trim().length < min)
    fail(where, `expected text of at least ${min} characters`);
  return value.trim();
}

function list(value: unknown, where: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) fail(where, "expected a list");
  return value;
}

function oneOf<T extends string>(value: unknown, options: readonly T[], where: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) fail(where, `expected one of ${options.join(", ")}`);
  return value as T;
}

/** Validates the topic map: shapes, known ids, one exercise per topic, and no prerequisite loops. */
export function parseTopicMap(raw: unknown, knownLabs: ReadonlyMap<string, readonly Mode[]>): TopicMap {
  if (!raw || typeof raw !== "object") fail("topics.yaml", "expected areas and topics");
  const input = raw as { areas?: unknown; topics?: unknown };
  const chapters: ChapterInfo[] = [];
  const areas = list(input.areas, "areas").map((value, index): AreaInfo => {
    const item = value as Record<string, unknown>;
    const where = `areas[${index}]`;
    const id = oneOf(item.id, AREAS, `${where}.id`);
    const own = list(item.chapters, `${where}.chapters`).map((entry, chapterIndex): ChapterInfo => {
      const chapter = entry as Record<string, unknown>;
      const at = `${where}.chapters[${chapterIndex}]`;
      const chapterId = text(chapter.id, `${at}.id`);
      if (!/^[a-z]+(-[a-z]+)*$/.test(chapterId)) fail(at, "chapter id must be kebab-case");
      return { id: chapterId, title: text(chapter.title, `${at}.title`), area: id };
    });
    if (!own.length) fail(where, "an area needs at least one chapter");
    chapters.push(...own);
    return { id, title: text(item.title, `${where}.title`), chapters: own.map((chapter) => chapter.id) };
  });
  if (areas.map((area) => area.id).join() !== AREAS.join()) fail("areas", `expected ${AREAS.join(", ")} in order`);
  const chapterIds = new Set(chapters.map((item) => item.id));
  if (chapterIds.size !== chapters.length) fail("chapters", "duplicate chapter id");

  const topics = list(input.topics, "topics").map((value, index): Topic => {
    const item = value as Record<string, unknown>;
    const where = `topics[${index}] ${String(item?.id ?? "")}`.trim();
    const id = text(item.id, `${where}.id`);
    if (!/^[a-z]+(\.[a-z_]+)+$/.test(id)) fail(where, "id must look like area.name");
    const chapter = text(item.chapter, `${where}.chapter`);
    if (!chapterIds.has(chapter)) fail(where, `unknown chapter ${chapter}`);
    const prove = list(item.prove, `${where}.prove`).map((mode) => oneOf(mode, MODES, `${where}.prove`));
    if (!prove.length) fail(where, "prove must list at least one mode");
    const labs = list(item.labs, `${where}.labs`).map((lab) => text(lab, `${where}.labs`));
    if (labs.length !== 1) fail(where, "a topic has exactly one exercise");
    for (const lab of labs) if (!knownLabs.has(lab)) fail(where, `unknown lab ${lab}`);
    const sourceGroups = list(item.sourceGroups, `${where}.sourceGroups`).map((group) =>
      oneOf(group, Object.keys(SOURCE_DOMAINS) as SourceGroup[], `${where}.sourceGroups`),
    );
    if (!sourceGroups.length) fail(where, "sourceGroups must list at least one group");
    const codeChecked =
      prove.includes("predict") || labs.some((lab) => knownLabs.get(lab)!.some((mode) => prove.includes(mode)));
    if (!codeChecked)
      fail(where, "prove must include predict, or a mode covered by one of its labs, so validation can rest on code");
    return {
      id,
      title: text(item.title, `${where}.title`),
      chapter,
      requires: list(item.requires, `${where}.requires`).map((value) => text(value, `${where}.requires`)),
      freshness: oneOf(item.freshness, FRESHNESS, `${where}.freshness`),
      sourceGroups,
      gap: text(item.gap, `${where}.gap`, 20),
      depth: oneOf(item.depth ?? "working", ["working", "deep"] as const, `${where}.depth`),
      prove,
      labs,
      points: [],
    };
  });

  const ids = new Set(topics.map((topic) => topic.id));
  if (ids.size !== topics.length) fail("topics", "duplicate topic id");
  for (const topic of topics) {
    for (const required of topic.requires) {
      if (!ids.has(required)) fail(topic.id, `requires unknown topic ${required}`);
      if (required === topic.id) fail(topic.id, "requires itself");
    }
  }
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string, path: string[]) => {
    if (state.get(id) === "done") return;
    if (state.get(id) === "visiting") fail("topics", `prerequisite loop: ${[...path, id].join(" -> ")}`);
    state.set(id, "visiting");
    for (const required of byId.get(id)!.requires) visit(required, [...path, id]);
    state.set(id, "done");
  };
  for (const topic of topics) visit(topic.id, []);
  for (const chapter of chapters) {
    if (!topics.some((topic) => topic.chapter === chapter.id)) fail(chapter.id, "a chapter needs at least one topic");
  }
  // Topics follow course order: chapter by chapter, in the order the YAML lists them within a chapter.
  const chapterOrder = new Map(chapters.map((item, index) => [item.id, index]));
  const ordered = topics
    .map((topic, index) => ({ topic, index }))
    .sort((a, b) => chapterOrder.get(a.topic.chapter)! - chapterOrder.get(b.topic.chapter)! || a.index - b.index)
    .map((entry) => entry.topic);
  return { areas, chapters, topics: ordered };
}

export const POINTS_PER_TOPIC = { min: 4, max: 6 } as const;

/**
 * Attaches assessment points (content/engineering-lab/curriculum/points.yaml) to the topic map. Every written topic needs
 * 4 to 6; unknown topic ids fail. Returns the review status so the app can say whether the owner has approved them.
 */
export function attachPoints(
  map: TopicMap,
  raw: unknown,
): { map: TopicMap; status: "draft" | "approved"; reviewedOn: string | null } {
  const input = (raw ?? {}) as { status?: unknown; reviewedOn?: unknown; topics?: unknown };
  const status = oneOf(input.status ?? "draft", ["draft", "approved"] as const, "points.status");
  const reviewedOn =
    input.reviewedOn === null || input.reviewedOn === undefined ? null : text(input.reviewedOn, "points.reviewedOn");
  if (status === "approved" && !reviewedOn) fail("points", "approved points need reviewedOn");
  const byTopic = (input.topics ?? {}) as Record<string, unknown>;
  const ids = new Set(map.topics.map((topic) => topic.id));
  for (const id of Object.keys(byTopic)) if (!ids.has(id)) fail("points", `unknown topic ${id}`);
  const topics = map.topics.map((topic) => {
    const points = list(byTopic[topic.id], `points.${topic.id}`).map((point) => text(point, `points.${topic.id}`, 10));
    if (points.length < POINTS_PER_TOPIC.min || points.length > POINTS_PER_TOPIC.max)
      fail(
        `points.${topic.id}`,
        `expected ${POINTS_PER_TOPIC.min} to ${POINTS_PER_TOPIC.max} points, found ${points.length}`,
      );
    return { ...topic, points };
  });
  return { map: { ...map, topics }, status, reviewedOn };
}
