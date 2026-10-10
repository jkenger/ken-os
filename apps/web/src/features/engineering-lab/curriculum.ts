import type { LabDefinition, Topic } from "@ken-os/domain";
import { assessment, authoredTopics, careers, labs, topicMap } from "./generated/curriculum.generated";

export { assessment, authoredTopics, careers, labs, topicMap };

export function findChapter(chapterId: string) {
  return topicMap.chapters.find((chapter) => chapter.id === chapterId);
}

export function findTopic(topicId: string): Topic | undefined {
  return topicMap.topics.find((topic) => topic.id === topicId);
}

/** Where a topic sits in the course: its area and chapter, for "Area · Chapter". */
export function placeOf(topic: Topic) {
  const chapter = topicMap.chapters.find((item) => item.id === topic.chapter)!;
  const area = topicMap.areas.find((item) => item.id === chapter.area)!;
  return { area: area.title, chapter: chapter.title };
}

export function findLab(labId: string) {
  return labs.find((lab) => lab.id === labId);
}

/** A topic's one exercise. Every topic has exactly one; the generator checks it. */
export function exerciseFor(topic: Topic): LabDefinition {
  return findLab(topic.labs[0])!;
}
