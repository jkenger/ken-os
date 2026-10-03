import { SOURCE_DOMAINS, type FreshnessClass, type ResearchTarget, type SourceGroup } from "./sources";
import { LABELS, MODES, type Label, type Mode } from "./types";

export const TRACKS = ["fullstack", "ai"] as const;
export type Track = (typeof TRACKS)[number];

export interface TrackInfo {
  id: Track;
  title: string;
  summary: string;
}

/** A chapter of the course. `planned` names topics in the outline that aren't written yet. */
export interface ModuleInfo {
  id: string;
  title: string;
  track: Track;
  planned: string[];
}

export interface Topic {
  id: string;
  title: string;
  module: string;
  requires: string[];
  freshness: FreshnessClass;
  sourceGroups: SourceGroup[];
  /** The exact gap to repair, from the baseline. */
  gap: string;
  depth: "working" | "deep";
  /** Proof modes that must all be solid before the topic counts as validated. */
  prove: Mode[];
  labs: string[];
}

export interface TopicMap {
  tracks: TrackInfo[];
  modules: ModuleInfo[];
  topics: Topic[];
}

export interface BaselineEntry {
  topicId: string;
  label: Label;
  mode: Mode;
  notes: string;
  misconceptions: string[];
}

export interface Baseline {
  assessedOn: string;
  entries: BaselineEntry[];
}

const FRESHNESS: FreshnessClass[] = ["core_concept", "web_platform", "framework", "ai_ecosystem"];

function fail(where: string, message: string): never {
  throw new Error(`${where}: ${message}`);
}

function text(value: unknown, where: string, min = 1): string {
  if (typeof value !== "string" || value.trim().length < min) fail(where, `expected text of at least ${min} characters`);
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

/** Validates the topic map: shapes, known ids, known labs, and no prerequisite loops. */
export function parseTopicMap(raw: unknown, knownLabs: ReadonlyMap<string, readonly Mode[]>): TopicMap {
  if (!raw || typeof raw !== "object") fail("topics.yaml", "expected tracks, modules and topics");
  const input = raw as { tracks?: unknown; modules?: unknown; topics?: unknown };
  const tracks = list(input.tracks, "tracks").map((value, index): TrackInfo => {
    const item = value as Record<string, unknown>;
    const where = `tracks[${index}]`;
    return { id: oneOf(item.id, TRACKS, `${where}.id`), title: text(item.title, `${where}.title`), summary: text(item.summary, `${where}.summary`) };
  });
  if (new Set(tracks.map((track) => track.id)).size !== tracks.length) fail("tracks", "duplicate track id");
  const modules = list(input.modules, "modules").map((value, index): ModuleInfo => {
    const item = value as Record<string, unknown>;
    const where = `modules[${index}]`;
    const track = oneOf(item.track, TRACKS, `${where}.track`);
    if (!tracks.some((entry) => entry.id === track)) fail(where, `track ${track} is not listed under tracks`);
    return {
      id: text(item.id, `${where}.id`),
      title: text(item.title, `${where}.title`),
      track,
      planned: list(item.planned, `${where}.planned`).map((title) => text(title, `${where}.planned`)),
    };
  });
  const moduleIds = new Set(modules.map((item) => item.id));
  if (moduleIds.size !== modules.length) fail("modules", "duplicate module id");

  const topics = list(input.topics, "topics").map((value, index): Topic => {
    const item = value as Record<string, unknown>;
    const where = `topics[${index}] ${String(item?.id ?? "")}`.trim();
    const id = text(item.id, `${where}.id`);
    if (!/^[a-z]+(\.[a-z_]+)+$/.test(id)) fail(where, "id must look like area.name");
    const module = text(item.module, `${where}.module`);
    if (!moduleIds.has(module)) fail(where, `unknown module ${module}`);
    const prove = list(item.prove, `${where}.prove`).map((mode) => oneOf(mode, MODES, `${where}.prove`));
    if (!prove.length) fail(where, "prove must list at least one mode");
    const labs = list(item.labs, `${where}.labs`).map((lab) => text(lab, `${where}.labs`));
    for (const lab of labs) if (!knownLabs.has(lab)) fail(where, `unknown lab ${lab}`);
    const sourceGroups = list(item.sourceGroups, `${where}.sourceGroups`).map((group) => oneOf(group, Object.keys(SOURCE_DOMAINS) as SourceGroup[], `${where}.sourceGroups`));
    if (!sourceGroups.length) fail(where, "sourceGroups must list at least one group");
    const codeChecked = prove.includes("predict") || labs.some((lab) => knownLabs.get(lab)!.some((mode) => prove.includes(mode)));
    if (!codeChecked) fail(where, "prove must include predict, or a mode covered by one of its labs, so validation can rest on code");
    return {
      id,
      title: text(item.title, `${where}.title`),
      module,
      requires: list(item.requires, `${where}.requires`).map((value) => text(value, `${where}.requires`)),
      freshness: oneOf(item.freshness, FRESHNESS, `${where}.freshness`),
      sourceGroups,
      gap: text(item.gap, `${where}.gap`, 20),
      depth: oneOf(item.depth ?? "working", ["working", "deep"] as const, `${where}.depth`),
      prove,
      labs,
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
  for (const module of modules) {
    if (!module.planned.length && !topics.some((topic) => topic.module === module.id)) fail(module.id, "a chapter needs topics or planned topic names");
  }
  return { tracks, modules, topics };
}

export function parseBaseline(raw: unknown, map: TopicMap): Baseline {
  const input = raw as { assessedOn?: unknown; entries?: unknown };
  const assessedOn = text(input?.assessedOn, "baseline.assessedOn");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assessedOn)) fail("baseline.assessedOn", "expected YYYY-MM-DD");
  const ids = new Set(map.topics.map((topic) => topic.id));
  const entries = list(input.entries, "baseline.entries").map((value, index): BaselineEntry => {
    const item = value as Record<string, unknown>;
    const where = `baseline.entries[${index}]`;
    const topicId = text(item.topicId, `${where}.topicId`);
    if (!ids.has(topicId)) fail(where, `unknown topic ${topicId}`);
    return {
      topicId,
      label: oneOf(item.label, LABELS, `${where}.label`),
      mode: oneOf(item.mode ?? "explain", MODES, `${where}.mode`),
      notes: text(item.notes, `${where}.notes`),
      misconceptions: list(item.misconceptions, `${where}.misconceptions`).map((value) => text(value, `${where}.misconceptions`)),
    };
  });
  if (new Set(entries.map((entry) => entry.topicId)).size !== entries.length) fail("baseline", "one entry per topic");
  return { assessedOn, entries };
}

export function researchTargetFor(topic: Topic): ResearchTarget {
  const allowedDomains = [...new Set(topic.sourceGroups.flatMap((group) => SOURCE_DOMAINS[group]))];
  return { topicId: topic.id, title: topic.title, gap: topic.gap, freshness: topic.freshness, allowedDomains };
}
