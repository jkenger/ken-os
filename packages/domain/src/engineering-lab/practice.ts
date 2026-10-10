import { isReviewDue, type TopicProgress } from "./progress";
import type { DailyItem } from "./profile";

// Practice: a stable daily set of 4. Spec: docs/architecture/engineering-rebuild.md, section 3 (Practice).

export const PRACTICE_SIZE = 4;

export type PracticePick = Pick<DailyItem, "topicId" | "reason">;

/**
 * Reviews due first, then proven topics whose source changed, then topics with a misconception in a graded answer,
 * then the topic in progress. Before anything is proven, it draws from topics in Learning or Practicing. Each topic
 * appears once; older due dates and older activity come first.
 */
export function pickPractice(progress: TopicProgress[], changed: string[], now: Date, size = PRACTICE_SIZE): PracticePick[] {
  const picks: PracticePick[] = [];
  const add = (topicId: string, reason: PracticePick["reason"]) => {
    if (picks.length < size && !picks.some((pick) => pick.topicId === topicId)) picks.push({ topicId, reason });
  };
  const byDue = (a: TopicProgress, b: TopicProgress) => (a.nextReviewAt ?? "").localeCompare(b.nextReviewAt ?? "");
  const byActivity = (a: TopicProgress, b: TopicProgress) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? "");
  const proven = progress.filter((item) => item.state === "PROVEN");
  for (const item of proven.filter((entry) => isReviewDue(entry, now)).sort(byDue)) add(item.topicId, "due");
  for (const item of proven.filter((entry) => changed.includes(entry.topicId))) add(item.topicId, "changed");
  for (const item of progress.filter((entry) => entry.lastLabel === "misconception").sort(byActivity)) add(item.topicId, "misconception");
  for (const item of progress.filter((entry) => entry.state === "LEARNING" || entry.state === "PRACTICING").sort(byActivity)) add(item.topicId, "active");
  return picks;
}
