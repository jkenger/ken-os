import type { AttemptRecord, Mode, Topic } from "@ken-os/domain";
import { baseline, labs, topicMap } from "./generated/curriculum.generated";

export { baseline, labs, topicMap };

export function findTopic(topicId: string): Topic | undefined {
  return topicMap.topics.find((topic) => topic.id === topicId);
}

/** Where a topic sits in the course, for breadcrumbs: its track and its chapter's number within that track. */
export function placeOf(topic: Topic) {
  const chapter = topicMap.modules.find((item) => item.id === topic.module)!;
  const inTrack = topicMap.modules.filter((item) => item.track === chapter.track);
  const track = topicMap.tracks.find((item) => item.id === chapter.track);
  return { track: track?.title ?? chapter.track, chapterNumber: inTrack.indexOf(chapter) + 1, chapterTitle: chapter.title };
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

/** The baseline as attempts, so before and after come from the same history. Never proof of anything. */
export function baselineAttempts(): AttemptRecord[] {
  const at = new Date(`${baseline.assessedOn}T00:00:00Z`);
  return baseline.entries.map((entry) => ({
    id: `baseline:${entry.topicId}`,
    topicId: entry.topicId,
    kind: "baseline",
    mode: entry.mode,
    label: entry.label,
    gradedBy: "baseline",
    voided: false,
    selfRating: null,
    misconceptions: entry.misconceptions,
    solutionSeen: false,
    createdAt: at,
  }));
}
