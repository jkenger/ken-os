import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";

// The path inside a topic, Next topic and chapter done (docs/architecture/engineering-progressive-flow.md, sections 2
// and 3). Pure, so the panel, Claude's tools and the tests share them.

/** Where the owner is with the topic's exercise: a run passed, they ran it, not yet, or there's no exercise. */
export type PracticeState = "passed" | "tried" | "not_tried" | "none";

export type StepId = "learn" | "practice" | "prove";
export type StepState = "done" | "todo" | "optional" | "skipped" | "none";

/**
 * Learn → Practice → Prove, and which one gets the main button. Learn is done once Claude has started (In progress),
 * Practice once a run passed, Prove once the topic is Learned. Practice never blocks Prove. A finished topic (Learned or
 * Skipped) points to the next topic instead.
 */
export function topicSteps({ status, practice }: { status: TopicStatus; practice: PracticeState }) {
  const finished = status === "learned" || status === "skipped";
  const steps: { id: StepId; state: StepState }[] = [
    { id: "learn", state: status === "skipped" ? "skipped" : status === "not_started" ? "todo" : "done" },
    { id: "practice", state: practice === "passed" ? "done" : practice === "none" ? "none" : "optional" },
    { id: "prove", state: status === "learned" ? "done" : status === "skipped" ? "skipped" : "todo" },
  ];
  const main: StepId | "next" = finished
    ? "next"
    : status === "not_started"
      ? "learn"
      : practice === "tried" || practice === "not_tried"
        ? "practice"
        : "prove";
  return { steps, main };
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
