import type { Mode, Topic } from "@ken-os/domain";
import { assessment, careers, labs, topicMap } from "./generated/curriculum.generated";

export { assessment, careers, labs, topicMap };

export function findChapter(chapterId: string) {
  return topicMap.chapters.find((chapter) => chapter.id === chapterId);
}

export function findTopic(topicId: string): Topic | undefined {
  return topicMap.topics.find((topic) => topic.id === topicId);
}

/** Where a topic sits in the course, for breadcrumbs: its area and its chapter's number within that area. */
export function placeOf(topic: Topic) {
  const chapter = topicMap.chapters.find((item) => item.id === topic.chapter)!;
  const area = topicMap.areas.find((item) => item.id === chapter.area)!;
  return { track: area.title, chapterNumber: area.chapters.indexOf(chapter.id) + 1, chapterTitle: chapter.title };
}

export function labsForTopic(topicId: string) {
  return labs.filter((lab) => lab.topics.includes(topicId));
}

export function findLab(labId: string) {
  return labs.find((lab) => lab.id === labId);
}

/**
 * Modes the Assessor writes questions for. A mode an authored lab already proves with code is left to the lab,
 * so the Assessor never stands in for a test.
 */
export function assessorModes(topic: Topic): Mode[] {
  const labModes = new Set(labsForTopic(topic.id).flatMap((lab) => lab.modes));
  return topic.prove.filter((mode) => !labModes.has(mode));
}

/**
 * Question types for a topic in the baseline assessment: the Assessor's types, and the same type twice when there is
 * only one, so every topic can get a follow-up without the Assessor standing in for a lab's test.
 */
export function runModes(topic: Topic): Mode[] {
  const modes = assessorModes(topic);
  return modes.length === 1 ? [modes[0], modes[0]] : modes;
}

