import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { pathChapters, staleLearned, type TopicStatus, type TopicStatusView } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labCustomTopics, labRoadmaps } from "@/lib/schema";
import { customTopics, requireAnyTopic } from "./any-topic";
import { getTopicChat } from "./claude-links";
import { careers, topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { getProfileRow } from "./profile-store";
import { normalizePlan, PlanError, type PlanInput } from "./roadmap-plan";
import { listNotes, listReports, topicStatus, topicStatuses, type NoteView, type ReportView } from "./status-store";

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
  goal: { id: string | null; title: string } | null;
  /** True when Claude planned this roadmap; false for the target role's path. */
  planned: boolean;
  chapters: RoadmapChapter[];
  counts: { learned: number; skipped: number; inProgress: number; total: number };
  /** The most recently changed In progress topic, else the first Not started one. */
  current: { id: string; title: string; chapterId: string; area: string; chapter: string; status: TopicStatus } | null;
}

const notStarted: TopicStatusView = { status: "not_started", setBy: null, changedAt: null, learnedAt: null };

export async function activeRoadmap(userId: string) {
  const [row] = await db()
    .select()
    .from(labRoadmaps)
    .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.status, "active")))
    .limit(1);
  return row ?? null;
}

/** The roadmap's chapters with their topic ids: the saved roadmap, or the target role's path. */
async function roadmapShape(userId: string) {
  const saved = await activeRoadmap(userId);
  if (saved) return { goal: { id: null, title: saved.goal }, planned: true, chapters: saved.chapters };
  const profile = await getProfileRow(userId);
  const role = careers.roles.find((item) => item.id === profile?.direction);
  // The chapters the target role needs, in course order (no assessment scores to reorder them any more).
  const chapterIds = role ? pathChapters(topicMap, careers, role, {}) : topicMap.chapters.map((chapter) => chapter.id);
  return {
    goal: role ? { id: role.id, title: role.title } : null,
    planned: false,
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

export async function getRoadmap(userId: string): Promise<RoadmapView> {
  const [shape, statuses, custom] = await Promise.all([
    roadmapShape(userId),
    topicStatuses(userId),
    customTopics(userId),
  ]);
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
    goal: shape.goal,
    planned: shape.planned,
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
  };
}

/**
 * Saves a roadmap Claude planned and the owner agreed to. The old one is archived, never deleted, and progress stays
 * with the topics. Claude's new topics are stored with their lines.
 */
export async function saveRoadmap(userId: string, input: PlanInput) {
  const custom = await customTopics(userId);
  let plan;
  try {
    plan = normalizePlan(input, topicMap, new Set(custom.map((topic) => topic.id)));
  } catch (error) {
    if (error instanceof PlanError) throw new LabInputError(error.message);
    throw error;
  }
  const id = randomUUID();
  await db().transaction(async (tx) => {
    await tx
      .update(labRoadmaps)
      .set({ status: "archived", archivedAt: new Date() })
      .where(and(eq(labRoadmaps.userId, userId), eq(labRoadmaps.status, "active")));
    if (plan.newTopics.length) {
      await tx.insert(labCustomTopics).values(plan.newTopics.map((topic) => ({ userId, ...topic })));
    }
    await tx.insert(labRoadmaps).values({ id, userId, goal: plan.goal, chapters: plan.chapters, status: "active" });
  });
  return {
    id,
    goal: plan.goal,
    chapters: plan.chapters.map((chapter) => ({
      chapterId: chapter.id,
      title: chapter.title,
      topics: chapter.topicIds.length,
    })),
    addedTopics: plan.newTopics.map((topic) => ({ topicId: topic.id, title: topic.title })),
  };
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

/** The chapter a topic sits in on the active roadmap, for topics Claude added. */
export async function chapterOnRoadmap(userId: string, topicId: string) {
  const saved = await activeRoadmap(userId);
  const chapter = saved?.chapters.find((item) => item.topicIds.includes(topicId));
  return chapter ? { chapter: chapter.title } : undefined;
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
}

/** Everything the roadmap's topic panel shows, except the code exercise, which loads when opened. */
export async function getTopicPanel(userId: string, topicId: string): Promise<TopicPanelView> {
  const topic = await requireAnyTopic(userId, topicId, await chapterOnRoadmap(userId, topicId));
  const [status, reports, notes, chatUrl] = await Promise.all([
    topicStatus(userId, topicId),
    listReports(userId, topicId, 20),
    listNotes(userId, topicId),
    getTopicChat(userId, topicId),
  ]);
  const { id, title, custom, area, chapter, gap, points } = topic;
  return { id, title, custom, area, chapter, gap, points, status, reports, notes, chatUrl };
}

/** The Engineering line on the Ken OS home page: the goal and how many topics are learned. */
export async function engineeringSummary(userId: string): Promise<{ headline: string; detail: string }> {
  const view = await getRoadmap(userId);
  return {
    headline: view.goal?.title ?? "Engineering",
    detail: `${view.counts.learned} of ${view.counts.total} learned`,
  };
}
