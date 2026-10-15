import type { RoadmapChapter } from "./roadmap-store";
import { chapterDone, nextTopic } from "./topic-steps";

// Several roadmaps at once (docs/architecture/engineering-roadmaps.md): the limit, which one opens, and what Claude hears
// about each. Pure, so the store, Claude's tools and the tests share them.

export const ROADMAP_LIMIT = 3;
export const ROADMAP_LIMIT_MESSAGE = `${ROADMAP_LIMIT} roadmaps are active. Ask the owner to archive one first`;

export const canAddRoadmap = (active: number) => active < ROADMAP_LIMIT;

/** Most recently opened first; a roadmap never opened counts from when it was made. Returns a new array. */
export function orderRoadmaps<T extends { createdAt: Date; lastOpenedAt: Date | null }>(rows: T[]) {
  const when = (row: T) => (row.lastOpenedAt ?? row.createdAt).getTime();
  return [...rows].sort((a, b) => when(b) - when(a));
}

/**
 * For each roadmap with the topic: its Next topic and, when the topic finished its chapter, that chapter's title. What
 * report_progress returns on Learned or Skipped.
 */
export function progressOnRoadmaps(
  views: { id: string | null; goal: { title: string } | null; chapters: RoadmapChapter[] }[],
  topicId: string,
) {
  return views
    .filter((view) => view.chapters.some((chapter) => chapter.topics.some((topic) => topic.id === topicId)))
    .map((view) => ({
      roadmapId: view.id,
      goal: view.goal?.title ?? null,
      next: nextTopic(view.chapters, topicId),
      chapterDone: chapterDone(view.chapters, topicId)?.title ?? null,
    }));
}

/** Topics Ready to check, the longest waiting first, so the next session starts with the fresh check. */
export function toCheck(view: { chapters: RoadmapChapter[] }) {
  return view.chapters
    .flatMap((chapter) => chapter.topics)
    .filter((topic) => topic.status === "ready_to_check")
    .sort((a, b) => (a.changedAt ?? "").localeCompare(b.changedAt ?? ""));
}
