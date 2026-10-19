import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { pathChapters, readStatus, staleLearned, type TopicStatus, type TopicStatusView } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labCustomTopics, labRoadmaps, labTopicEvents } from "@/lib/schema";
import { customTopics, requireAnyTopic } from "./any-topic";
import { getTopicChat } from "./claude-links";
import { practiceState } from "./exercise-store";
import { careers, topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { getProfileRow } from "./profile-store";
import { normalizePlan, PlanError, type PlanInput } from "./roadmap-plan";
import { isComplete, roadmapSummary } from "./roadmap-summary";
import { canAddRoadmap, orderRoadmaps, ROADMAP_LIMIT_MESSAGE } from "./roadmaps";
import {
  latestBuild,
  listNotes,
  listReports,
  topicStatus,
  topicStatuses,
  type BuildView,
  type NoteView,
  type ReportView,
} from "./status-store";
import { chapterDone, nextTopic, type PracticeState } from "./topic-steps";
import { waitingOn, type TopicMaterial, type TopicPlan } from "./topic-material";
import { getMaterial, getPlans } from "./topic-material-store";

// The owner's roadmap with every topic's status: what the roadmap page draws and what Claude's state tools read.
// Spec: docs/architecture/engineering-claude-first.md, sections 1 to 3. The roadmap is the one Claude planned and the
// owner agreed to; without one, it's the target role's path (or every chapter in course order without a role).

export interface RoadmapTopic {
  id: string;
  title: string;
  /** Added by Claude, not from the reviewed map. */
  custom: boolean;
  status: TopicStatus;
  changedAt: string | null;
  learnedAt: string | null;
}

export interface RoadmapChapter {
  id: string;
  title: string;
  area: string;
  topics: RoadmapTopic[];
}

export interface RoadmapView {
  /** The saved roadmap's id; null for the target role's path. */
  id: string | null;
  goal: { id: string | null; title: string } | null;
  /** True when Claude planned this roadmap; false for the target role's path. */
  planned: boolean;
  /** False for an archived roadmap, which opens read-only. */
  active: boolean;
  /** When it was archived; null while active. */
  archivedAt: string | null;
  chapters: RoadmapChapter[];
  counts: { learned: number; skipped: number; inProgress: number; total: number };
  /** The most recently changed In progress topic, else the first Not started one. */
  current: { id: string; title: string; chapterId: string; area: string; chapter: string; status: TopicStatus } | null;
  /** Claude's plan for each topic on this roadmap, by topic id (docs/architecture/roadmap-ui.md). Empty until saved. */
  plans: Record<string, TopicPlan>;
}

const notStarted: TopicStatusView = { status: "not_started", setBy: null, changedAt: null, learnedAt: null };

type RoadmapRow = typeof labRoadmaps.$inferSelect;
interface RoadmapShape {
  id: string | null;
  goal: RoadmapView["goal"];
  planned: boolean;
  active: boolean;
  archivedAt: string | null;
  chapters: { id: string; title: string; topicIds: string[] }[];
}

/** The owner's active roadmaps, most recently opened first (docs/architecture/engineering-roadmaps.md). */
export async function activeRoadmaps(userId: string) {
  const rows = await db()
    .select()
    .from(labRoadmaps)
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.status, "active")));
  return orderRoadmaps(rows);
}

/** One of the owner's roadmaps, active or archived. */
async function requireRoadmap(userId: string, roadmapId: string) {
  const [row] = await db()
    .select()
    .from(labRoadmaps)
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.id, roadmapId)))
    .limit(1);
  if (!row) throw new LabInputError(`Unknown roadmap "${roadmapId}"`);
  return row;
}

const savedShape = (row: RoadmapRow): RoadmapShape => ({
  id: row.id,
  goal: { id: null, title: row.goal },
  planned: true,
  active: row.status === "active",
  archivedAt: row.status === "archived" ? (row.archivedAt?.toISOString() ?? null) : null,
  chapters: row.chapters,
});

/** The target role's path, shown until the first roadmap is saved. */
async function defaultShape(userId: string): Promise<RoadmapShape> {
  const profile = await getProfileRow(userId);
  const role = careers.roles.find((item) => item.id === profile?.direction);
  // The chapters the target role needs, in course order (no assessment scores to reorder them any more).
  const chapterIds = role ? pathChapters(topicMap, careers, role, {}) : topicMap.chapters.map((chapter) => chapter.id);
  return {
    id: null,
    goal: role ? { id: role.id, title: role.title } : null,
    planned: false,
    active: true,
    archivedAt: null,
    chapters: chapterIds.map((chapterId) => ({
      id: chapterId,
      title: topicMap.chapters.find((chapter) => chapter.id === chapterId)!.title,
      topicIds: topicMap.topics.filter((topic) => topic.chapter === chapterId).map((topic) => topic.id),
    })),
  };
}

function areaOf(chapterId: string) {
  const chapter = topicMap.chapters.find((item) => item.id === chapterId);
  return chapter ? topicMap.areas.find((item) => item.id === chapter.area)!.title : "Added by Claude";
}

function buildView(
  shape: RoadmapShape,
  statuses: Map<string, TopicStatusView>,
  custom: Awaited<ReturnType<typeof customTopics>>,
  plans: Record<string, TopicPlan> = {},
): RoadmapView {
  const titleOf = (topicId: string) =>
    topicMap.topics.find((topic) => topic.id === topicId)?.title ?? custom.find((topic) => topic.id === topicId)?.title;
  const chapters = shape.chapters.map((chapter): RoadmapChapter => ({
    id: chapter.id,
    title: chapter.title,
    area: areaOf(chapter.id),
    // A topic removed from the map since the roadmap was saved is left out.
    topics: chapter.topicIds.flatMap((topicId) => {
      const title = titleOf(topicId);
      if (!title) return [];
      const status = statuses.get(topicId) ?? notStarted;
      return [
        {
          id: topicId,
          title,
          custom: topicId.startsWith("custom."),
          status: status.status,
          changedAt: status.changedAt,
          learnedAt: status.learnedAt,
        },
      ];
    }),
  }));
  const all = chapters.flatMap((chapter) => chapter.topics.map((topic) => ({ ...topic, chapter })));
  const inProgress = all
    .filter((topic) => topic.status === "in_progress")
    .sort((a, b) => (b.changedAt ?? "").localeCompare(a.changedAt ?? ""));
  const pick = inProgress[0] ?? all.find((topic) => topic.status === "not_started");
  const count = (status: TopicStatus) => all.filter((topic) => topic.status === status).length;
  return {
    id: shape.id,
    goal: shape.goal,
    planned: shape.planned,
    active: shape.active,
    archivedAt: shape.archivedAt,
    chapters,
    counts: {
      learned: count("learned"),
      skipped: count("skipped"),
      inProgress: count("in_progress"),
      total: all.length,
    },
    current: pick
      ? {
          id: pick.id,
          title: pick.title,
          chapterId: pick.chapter.id,
          area: pick.chapter.area,
          chapter: pick.chapter.title,
          status: pick.status,
        }
      : null,
    plans,
  };
}

/**
 * One roadmap with every topic's status: the one named, else the one opened last, else the target role's path when the
 * owner has no active roadmap.
 */
export async function getRoadmap(userId: string, roadmapId?: string | null): Promise<RoadmapView> {
  const [shape, statuses, custom] = await Promise.all([
    roadmapId
      ? requireRoadmap(userId, roadmapId).then(savedShape)
      : activeRoadmaps(userId).then((rows) => (rows[0] ? savedShape(rows[0]) : defaultShape(userId))),
    topicStatuses(userId),
    customTopics(userId),
  ]);
  return buildView(shape, statuses, custom, await getPlans(shape.id));
}

/** Every active roadmap, most recently opened first, or just the target role's path when there are none. */
export async function getRoadmaps(userId: string): Promise<RoadmapView[]> {
  const [rows, statuses, custom] = await Promise.all([
    activeRoadmaps(userId),
    topicStatuses(userId),
    customTopics(userId),
  ]);
  const shapes = rows.length ? rows.map(savedShape) : [await defaultShape(userId)];
  const plans = await Promise.all(shapes.map((shape) => getPlans(shape.id)));
  return shapes.map((shape, index) => buildView(shape, statuses, custom, plans[index]));
}

/**
 * Saves a roadmap Claude planned and the owner agreed to. Without `roadmapId` it's added next to the others, up to
 * ROADMAP_LIMIT active. With one, it re-plans that roadmap in place: the id (and so the address) stays, and the
 * version it replaces is kept as an archived copy. Nothing is deleted; progress stays with the topics. Claude's new
 * topics are stored with their lines.
 */
export async function saveRoadmap(userId: string, input: PlanInput, roadmapId?: string) {
  const [custom, active] = await Promise.all([customTopics(userId), activeRoadmaps(userId)]);
  const replacing = roadmapId ? active.find((row) => row.id === roadmapId) : undefined;
  if (roadmapId && !replacing) throw new LabInputError(`No active roadmap "${roadmapId}" to re-plan`);
  if (!replacing && !canAddRoadmap(active.length)) throw new LabInputError(ROADMAP_LIMIT_MESSAGE);
  let plan;
  try {
    plan = normalizePlan(input, topicMap, new Set(custom.map((topic) => topic.id)));
  } catch (error) {
    if (error instanceof PlanError) throw new LabInputError(error.message);
    throw error;
  }
  const id = replacing?.id ?? randomUUID();
  const now = new Date();
  await db().transaction(async (tx) => {
    if (plan.newTopics.length) {
      await tx.insert(labCustomTopics).values(plan.newTopics.map((topic) => ({ userId, ...topic })));
    }
    if (replacing) {
      await tx.insert(labRoadmaps).values({
        ...replacing,
        id: randomUUID(),
        status: "archived",
        archivedAt: now,
        lastOpenedAt: null,
        replacedBy: replacing.id,
      });
      await tx
        .update(labRoadmaps)
        .set({ goal: plan.goal, chapters: plan.chapters, lastOpenedAt: now })
        .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.id, replacing.id)));
    } else {
      await tx
        .insert(labRoadmaps)
        .values({ id, userId, goal: plan.goal, chapters: plan.chapters, status: "active", lastOpenedAt: now });
    }
  });
  return {
    id,
    replanned: Boolean(replacing),
    goal: plan.goal,
    chapters: plan.chapters.map((chapter) => ({
      chapterId: chapter.id,
      title: chapter.title,
      topics: chapter.topicIds.length,
    })),
    addedTopics: plan.newTopics.map((topic) => ({ topicId: topic.id, title: topic.title })),
  };
}

/** Archives a roadmap. Its topics keep their progress, and it can be restored. */
export async function archiveRoadmap(userId: string, roadmapId: string) {
  const row = await requireRoadmap(userId, roadmapId);
  if (row.status === "archived") return { id: row.id, status: "archived" as const };
  await db()
    .update(labRoadmaps)
    .set({ status: "archived", archivedAt: new Date() })
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.id, roadmapId)));
  return { id: row.id, status: "archived" as const };
}

/**
 * Deletes a roadmap, active or archived, with the versions Re-plan kept of it and Claude's plans for its topics. Topics
 * keep their progress, material and notes, since those belong to topics, not roadmaps.
 */
export async function deleteRoadmap(userId: string, roadmapId: string) {
  const row = await requireRoadmap(userId, roadmapId);
  await db()
    .delete(labRoadmaps)
    .where(and(eq(labRoadmaps.userId, userId), or(eq(labRoadmaps.id, row.id), eq(labRoadmaps.replacedBy, row.id))));
  return { id: row.id, deleted: true as const };
}

/** Brings an archived roadmap back, if fewer than ROADMAP_LIMIT are active. A replaced version comes back on its own. */
export async function restoreRoadmap(userId: string, roadmapId: string) {
  const [row, active] = await Promise.all([requireRoadmap(userId, roadmapId), activeRoadmaps(userId)]);
  if (row.status === "active") return { id: row.id, status: "active" as const };
  if (!canAddRoadmap(active.length)) throw new LabInputError(ROADMAP_LIMIT_MESSAGE);
  await db()
    .update(labRoadmaps)
    .set({ status: "active", archivedAt: null, replacedBy: null, lastOpenedAt: new Date() })
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.id, roadmapId)));
  return { id: row.id, status: "active" as const };
}

/**
 * The owner's archived roadmaps, most recently archived first, for the switcher's Archived section. A copy kept by
 * Re-plan names the roadmap it was replaced in.
 */
export async function archivedRoadmaps(userId: string, limit = 10) {
  const rows = await db()
    .select({
      id: labRoadmaps.id,
      goal: labRoadmaps.goal,
      archivedAt: labRoadmaps.archivedAt,
      replacedBy: labRoadmaps.replacedBy,
    })
    .from(labRoadmaps)
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.status, "archived")))
    .orderBy(desc(labRoadmaps.archivedAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, archivedAt: row.archivedAt?.toISOString() ?? null }));
}

/** Remembers that the owner opened this roadmap, so it opens next time on any device. */
export async function markRoadmapOpened(userId: string, roadmapId: string) {
  await db()
    .update(labRoadmaps)
    .set({ lastOpenedAt: new Date() })
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.id, roadmapId), eq(labRoadmaps.status, "active")));
}

/** Topics on the roadmap that are In progress, other than the current one, most recent first. */
export function alsoInProgress(view: RoadmapView) {
  return view.chapters
    .flatMap((chapter) => chapter.topics)
    .filter((topic) => topic.status === "in_progress" && topic.id !== view.current?.id)
    .sort((a, b) => (b.changedAt ?? "").localeCompare(a.changedAt ?? ""));
}

/** Learned topics on the roadmap old enough to offer a refresh. */
export function toRefresh(view: RoadmapView, now = new Date()) {
  return staleLearned(
    view.chapters.flatMap((chapter) => chapter.topics),
    now,
  );
}

/** The chapter a topic sits in on an active roadmap (the one opened last first), for topics Claude added. */
export async function chapterOnRoadmap(userId: string, topicId: string) {
  for (const row of await activeRoadmaps(userId)) {
    const chapter = row.chapters.find((item) => item.topicIds.includes(topicId));
    if (chapter) return { chapter: chapter.title };
  }
  return undefined;
}

export interface TopicPanelView {
  id: string;
  title: string;
  custom: boolean;
  area: string;
  chapter: string;
  /** What a map topic repairs, in one line. Null for Claude's topics. */
  gap: string | null;
  /** What the owner should be able to explain. */
  points: string[];
  status: TopicStatusView;
  reports: ReportView[];
  notes: NoteView[];
  /** The Claude chat this topic was learned in, if the owner linked one. */
  chatUrl: string | null;
  /** The Practice step (engineering-progressive-flow.md, section 2). */
  practice: PracticeState;
  /** The latest Build Claude reported with the owner's code, which ticks Build too; null when there is none. */
  build: BuildView | null;
  /** The next unfinished topic on the roadmap, and this topic's chapter when it's done (section 3). */
  next: { id: string; title: string } | null;
  chapterDone: { title: string; learned: number; total: number } | null;
  /** Claude's material for the topic; null until Claude writes it ("Not planned yet"). */
  material: TopicMaterial | null;
  /** Claude's plan for the topic on this roadmap, with titles and statuses filled in; null when there is none. */
  plan: {
    minutes: number | null;
    difficulty: TopicPlan["difficulty"];
    prerequisites: { id: string; title: string; status: TopicStatus }[];
    related: { id: string; title: string; chapter: string; status: TopicStatus }[];
    /** Prerequisites not yet Learned or Skipped: advice, not a lock. */
    waitingOn: string[];
  } | null;
}

/** Everything the roadmap's topic panel shows, except the code exercise, which loads when opened. */
/** Next topic and chapter done are worked out on `roadmapId`, else on the roadmap opened last. */
export async function getTopicPanel(
  userId: string,
  topicId: string,
  roadmapId?: string | null,
): Promise<TopicPanelView> {
  const topic = await requireAnyTopic(userId, topicId, await chapterOnRoadmap(userId, topicId));
  const [status, reports, notes, chatUrl, practice, build, roadmap, material] = await Promise.all([
    topicStatus(userId, topicId),
    listReports(userId, topicId, 20),
    listNotes(userId, topicId),
    getTopicChat(userId, topicId),
    practiceState(userId, topic),
    latestBuild(userId, topicId),
    getRoadmap(userId, roadmapId),
    getMaterial(userId, topicId),
  ]);
  const { id, title, custom, area, chapter, gap, points } = topic;
  return {
    ...{ id, title, custom, area, chapter, gap, points, status, reports, notes, chatUrl, practice, build },
    next: nextTopic(roadmap.chapters, topicId),
    chapterDone: chapterDone(roadmap.chapters, topicId),
    material,
    plan: planView(roadmap, topicId),
  };
}

/** A topic's plan on the roadmap, with each linked topic's title, chapter and status. */
function planView(roadmap: RoadmapView, topicId: string): TopicPanelView["plan"] {
  const plan = roadmap.plans[topicId];
  if (!plan) return null;
  const onRoadmap = new Map(
    roadmap.chapters.flatMap((chapter) => chapter.topics.map((topic) => [topic.id, { ...topic, chapter }] as const)),
  );
  const linked = (ids: string[]) =>
    ids.flatMap((id) => {
      const topic = onRoadmap.get(id);
      return topic ? [{ id, title: topic.title, chapter: topic.chapter.title, status: topic.status }] : [];
    });
  return {
    minutes: plan.minutes,
    difficulty: plan.difficulty,
    prerequisites: linked(plan.prerequisites).map(({ id, title, status }) => ({ id, title, status })),
    related: linked(plan.related),
    waitingOn: waitingOn(plan, (id) => onRoadmap.get(id)?.status),
  };
}

/**
 * The summary of a finished roadmap (docs/architecture/engineering-progressive-flow.md, section 4), from its topics'
 * reports and status changes. Null until every topic is Learned or Skipped.
 */
export async function getRoadmapSummary(userId: string, view: RoadmapView) {
  if (!isComplete(view.chapters)) return null;
  const topicIds = view.chapters.flatMap((chapter) => chapter.topics.map((topic) => topic.id));
  const rows = await db()
    .select({
      topicId: labTopicEvents.topicId,
      at: labTopicEvents.createdAt,
      status: labTopicEvents.status,
      summary: labTopicEvents.summary,
      evidence: labTopicEvents.evidence,
    })
    .from(labTopicEvents)
    .where(
      and(
        eq(labTopicEvents.userId, userId),
        inArray(labTopicEvents.topicId, topicIds),
        inArray(labTopicEvents.kind, ["report", "status_set"]),
      ),
    )
    .orderBy(asc(labTopicEvents.createdAt));
  return roadmapSummary(
    view.chapters,
    rows.map((row) => ({ ...row, status: readStatus(row.status), at: row.at.toISOString() })),
  );
}

export interface EngineeringLine {
  /** The roadmap it opens; null for the role's path. */
  roadmapId: string | null;
  headline: string;
  detail: string;
}

/**
 * The Engineering lines on the Profile page: one per active roadmap, opened last first, with its goal and how many topics
 * are learned (engineering-roadmaps.md, section 1). Before any roadmap, one line for the role's path.
 */
export async function engineeringSummary(userId: string): Promise<EngineeringLine[]> {
  return (await getRoadmaps(userId)).map((view) => ({
    roadmapId: view.planned ? view.id : null,
    headline: view.goal?.title ?? "Engineering",
    detail: `${view.counts.learned} of ${view.counts.total} learned`,
  }));
}
