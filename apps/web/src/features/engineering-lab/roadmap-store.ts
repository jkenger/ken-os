import { staleLearned, type TopicStatus, type TopicStatusView } from "@ken-os/domain";
import { careers, placeOf, topicMap } from "./curriculum";
import { getPathView } from "./path-store";
import { getProfileRow } from "./profile-store";
import { listNotes, listReports, topicStatus, topicStatuses, type NoteView, type ReportView } from "./status-store";
import { requireTopic } from "./store";

// The owner's roadmap with every topic's status: what the roadmap page draws and what Claude's state tools read.
// Spec: docs/architecture/engineering-claude-first.md, sections 1 to 3. Until slice 3 stores roadmaps, the roadmap is
// the target role's path (or every chapter in course order without one).

export interface RoadmapTopic {
  id: string;
  title: string;
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
  goal: { id: string; title: string } | null;
  chapters: RoadmapChapter[];
  counts: { learned: number; skipped: number; inProgress: number; total: number };
  /** The most recently changed In progress topic, else the first Not started one. */
  current: { id: string; title: string; chapterId: string; area: string; chapter: string; status: TopicStatus } | null;
}

export async function getRoadmap(userId: string): Promise<RoadmapView> {
  const [profile, path, statuses] = await Promise.all([
    getProfileRow(userId),
    getPathView(userId),
    topicStatuses(userId),
  ]);
  const role = careers.roles.find((item) => item.id === profile?.direction);
  const chapterIds = path.path ?? topicMap.chapters.map((chapter) => chapter.id);
  const chapters = chapterIds.map((chapterId): RoadmapChapter => {
    const chapter = topicMap.chapters.find((item) => item.id === chapterId)!;
    return {
      id: chapterId,
      title: chapter.title,
      area: topicMap.areas.find((item) => item.id === chapter.area)!.title,
      topics: topicMap.topics
        .filter((topic) => topic.chapter === chapterId)
        .map((topic) => {
          const status = statuses.get(topic.id) as TopicStatusView;
          return {
            id: topic.id,
            title: topic.title,
            status: status.status,
            changedAt: status.changedAt,
            learnedAt: status.learnedAt,
          };
        }),
    };
  });
  const all = chapters.flatMap((chapter) => chapter.topics.map((topic) => ({ ...topic, chapterId: chapter.id })));
  const inProgress = all
    .filter((topic) => topic.status === "in_progress")
    .sort((a, b) => (b.changedAt ?? "").localeCompare(a.changedAt ?? ""));
  const pick = inProgress[0] ?? all.find((topic) => topic.status === "not_started");
  const count = (status: TopicStatus) => all.filter((topic) => topic.status === status).length;
  return {
    goal: role ? { id: role.id, title: role.title } : null,
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
          chapterId: pick.chapterId,
          ...placeOf(topicMap.topics.find((topic) => topic.id === pick.id)!),
          status: pick.status,
        }
      : null,
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

export interface TopicPanelView {
  id: string;
  title: string;
  area: string;
  chapter: string;
  /** What the topic repairs, in one line. */
  gap: string;
  status: TopicStatusView;
  reports: ReportView[];
  notes: NoteView[];
}

/** Everything the roadmap's topic panel shows, except the code exercise, which loads when opened. */
export async function getTopicPanel(userId: string, topicId: string): Promise<TopicPanelView> {
  const topic = requireTopic(topicId);
  const [status, reports, notes] = await Promise.all([
    topicStatus(userId, topicId),
    listReports(userId, topicId, 20),
    listNotes(userId, topicId),
  ]);
  return { id: topic.id, title: topic.title, ...placeOf(topic), gap: topic.gap, status, reports, notes };
}
