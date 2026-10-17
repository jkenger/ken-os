import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";

// A topic's tasks, Next topic and chapter done (docs/architecture/engineering-progressive-flow.md, sections 2 and 3,
// and docs/architecture/roadmap-ui.md). Pure, so the panel, Claude's tools and the tests share them.

/** Where the owner is with the topic's exercise: a run passed, they ran it, not yet, or there's no exercise. */
export type PracticeState = "passed" | "tried" | "not_tried" | "none";

export type TaskId = "read" | "build" | "explain";
/** Done, still to do, waiting on an exercise (Build only), or the topic was skipped. */
export type TaskState = "done" | "todo" | "none" | "skipped";

/**
 * Read → Build → Explain, the same three for every topic, from what has happened: Read is done once Claude has started
 * (In progress), Build once an exercise run passed, Explain once the topic is Learned with the owner's own words. The
 * main button goes to the first task left to do; a finished topic (Learned or Skipped) points to the next topic.
 */
export function topicTasks({ status, practice }: { status: TopicStatus; practice: PracticeState }) {
  const skipped = status === "skipped";
  const state = (done: boolean, waiting = false): TaskState =>
    skipped ? "skipped" : done ? "done" : waiting ? "none" : "todo";
  const tasks: { id: TaskId; state: TaskState }[] = [
    { id: "read", state: state(status !== "not_started") },
    { id: "build", state: state(practice === "passed", practice === "none") },
    { id: "explain", state: state(status === "learned") },
  ];
  const finished = status === "learned" || skipped;
  const main: TaskId | "next" = finished ? "next" : (tasks.find((task) => task.state === "todo")?.id ?? "explain");
  return { tasks, done: tasks.filter((task) => task.state === "done").length, total: tasks.length, main };
}

const unfinished = (status: TopicStatus) => status !== "learned" && status !== "skipped";

/** The next topic in roadmap order that isn't Learned or Skipped, after this one and wrapping to earlier ones. */
export function nextTopic(chapters: RoadmapChapter[], topicId: string) {
  const all = chapters.flatMap((chapter) => chapter.topics);
  const at = all.findIndex((topic) => topic.id === topicId);
  const ordered = at < 0 ? all : [...all.slice(at + 1), ...all.slice(0, at)];
  const next = ordered.find((topic) => unfinished(topic.status));
  return next ? { id: next.id, title: next.title } : null;
}

/** The topic's chapter, when every topic in it is Learned or Skipped. */
export function chapterDone(chapters: RoadmapChapter[], topicId: string) {
  const chapter = chapters.find((item) => item.topics.some((topic) => topic.id === topicId));
  if (!chapter || chapter.topics.some((topic) => unfinished(topic.status))) return null;
  return {
    title: chapter.title,
    learned: chapter.topics.filter((topic) => topic.status === "learned").length,
    total: chapter.topics.length,
  };
}

/** Whether every topic in a chapter is Learned or Skipped, for the graph and lanes. */
export function isChapterDone(chapter: RoadmapChapter) {
  return chapter.topics.length > 0 && !chapter.topics.some((topic) => unfinished(topic.status));
}
