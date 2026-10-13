import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";

// The roadmap summary (docs/architecture/engineering-progressive-flow.md, section 4): once every topic is Learned or
// Skipped, what was learned, when, and in the owner's own words. Pure, so the page and the tests share it; the store
// feeds it the topics' reports and status changes.

/** A report or status change on a topic: Claude's evidence, or the owner's one line on why it's Learned. */
export interface SummaryEvent {
  topicId: string;
  at: string;
  status: TopicStatus | null;
  summary: string | null;
  evidence: string | null;
}

export interface SummaryTopic {
  id: string;
  title: string;
  status: "learned" | "skipped";
  at: string | null;
  /** The first sentence of the owner's explanation, or their reason when they marked it themselves. */
  words: string | null;
}

export interface RoadmapSummary {
  counts: { learned: number; skipped: number; chapters: number };
  startedAt: string | null;
  finishedAt: string | null;
  chapters: { title: string; topics: SummaryTopic[] }[];
}

const MAX = 160;

/** The first sentence, cut at MAX characters. A full stop inside a word ("v1.2") doesn't end it. */
export function firstSentence(text: string) {
  const trimmed = text.trim();
  const end = trimmed.search(/[.!?](\s|$)/);
  const sentence = end < 0 ? trimmed : trimmed.slice(0, end + 1);
  return sentence.length > MAX ? `${sentence.slice(0, MAX).trimEnd()}…` : sentence;
}

export function isComplete(chapters: RoadmapChapter[]) {
  const topics = chapters.flatMap((chapter) => chapter.topics);
  return topics.length > 0 && topics.every((topic) => topic.status === "learned" || topic.status === "skipped");
}

const earliest = (dates: (string | null)[]) => dates.filter(Boolean).sort()[0] ?? null;
const latest = (dates: (string | null)[]) => dates.filter(Boolean).sort().at(-1) ?? null;

/** Null until the roadmap is complete. `events` may be in any order. */
export function roadmapSummary(chapters: RoadmapChapter[], events: SummaryEvent[]): RoadmapSummary | null {
  if (!isComplete(chapters)) return null;
  const newestFirst = [...events].sort((a, b) => b.at.localeCompare(a.at));
  const summaryChapters = chapters.map((chapter) => ({
    title: chapter.title,
    topics: chapter.topics.map((topic): SummaryTopic => {
      const status = topic.status as SummaryTopic["status"];
      const last = newestFirst.find((item) => item.topicId === topic.id && item.status === status);
      const words = status === "learned" ? (last?.evidence ?? last?.summary ?? null) : null;
      return {
        id: topic.id,
        title: topic.title,
        status,
        at: last?.at ?? topic.learnedAt ?? topic.changedAt,
        words: words ? firstSentence(words) : null,
      };
    }),
  }));
  const topics = summaryChapters.flatMap((chapter) => chapter.topics);
  const learned = topics.filter((topic) => topic.status === "learned");
  return {
    counts: { learned: learned.length, skipped: topics.length - learned.length, chapters: chapters.length },
    startedAt: earliest([...events.map((item) => item.at), ...topics.map((topic) => topic.at)]),
    finishedAt: latest((learned.length ? learned : topics).map((topic) => topic.at)),
    chapters: summaryChapters,
  };
}
