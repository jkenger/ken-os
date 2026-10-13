import assert from "node:assert/strict";
import { test } from "node:test";
import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";
import { firstSentence, isComplete, roadmapSummary, type SummaryEvent } from "./roadmap-summary";

// The roadmap summary (docs/architecture/engineering-progressive-flow.md, section 4).

const topic = (id: string, status: TopicStatus, changedAt: string | null = null) => ({
  id,
  title: id.toUpperCase(),
  custom: false,
  status,
  changedAt,
  learnedAt: status === "learned" ? changedAt : null,
});
const chapter = (id: string, topics: ReturnType<typeof topic>[]): RoadmapChapter => ({
  id,
  title: `Chapter ${id}`,
  area: "Area",
  topics,
});
const event = (topicId: string, at: string, rest: Partial<SummaryEvent> = {}): SummaryEvent => ({
  topicId,
  at,
  status: null,
  summary: null,
  evidence: null,
  ...rest,
});

test("a roadmap is complete when every topic is Learned or Skipped", () => {
  assert.equal(isComplete([chapter("a", [topic("a1", "learned"), topic("a2", "skipped")])]), true);
  assert.equal(isComplete([chapter("a", [topic("a1", "learned"), topic("a2", "in_progress")])]), false);
  assert.equal(isComplete([]), false, "an empty roadmap isn't complete");
  assert.equal(isComplete([chapter("a", [])]), false);
});

test("an unfinished roadmap has no summary", () => {
  assert.equal(roadmapSummary([chapter("a", [topic("a1", "not_started")])], []), null);
});

test("the summary counts, spans and lists each topic with the owner's words", () => {
  const chapters = [
    chapter("a", [topic("a1", "learned", "2026-10-05T10:00:00Z"), topic("a2", "skipped", "2026-10-02T10:00:00Z")]),
    chapter("b", [topic("b1", "learned", "2026-10-09T10:00:00Z")]),
  ];
  const events = [
    event("a1", "2026-10-01T09:00:00Z", { summary: "Started" }),
    event("a2", "2026-10-02T10:00:00Z", { status: "skipped", summary: "Knows it from work" }),
    event("a1", "2026-10-05T10:00:00Z", {
      status: "learned",
      evidence: "A closure keeps the scope it was made in. Not a copy of the values.",
    }),
    event("b1", "2026-10-08T10:00:00Z", { status: "learned", summary: "Old reason" }),
    event("b1", "2026-10-09T10:00:00Z", { status: "learned", summary: "Built the retry policy at work" }),
  ];
  const summary = roadmapSummary(chapters, events)!;
  assert.deepEqual(summary.counts, { learned: 2, skipped: 1, chapters: 2 });
  assert.equal(summary.startedAt, "2026-10-01T09:00:00Z", "the first report on any of its topics");
  assert.equal(summary.finishedAt, "2026-10-09T10:00:00Z", "the last Learned");
  assert.deepEqual(summary.chapters[0], {
    title: "Chapter a",
    topics: [
      {
        id: "a1",
        title: "A1",
        status: "learned",
        at: "2026-10-05T10:00:00Z",
        words: "A closure keeps the scope it was made in.",
      },
      { id: "a2", title: "A2", status: "skipped", at: "2026-10-02T10:00:00Z", words: null },
    ],
  });
  assert.equal(
    summary.chapters[1].topics[0].words,
    "Built the retry policy at work",
    "the latest Learned, by the owner",
  );
});

test("a Learned topic with no history still shows, with its date and no words", () => {
  const summary = roadmapSummary([chapter("a", [topic("a1", "learned", "2026-10-05T10:00:00Z")])], [])!;
  assert.deepEqual(summary.chapters[0].topics[0], {
    id: "a1",
    title: "A1",
    status: "learned",
    at: "2026-10-05T10:00:00Z",
    words: null,
  });
  assert.equal(summary.startedAt, "2026-10-05T10:00:00Z");
});

test("the evidence line is its first sentence, kept short", () => {
  assert.equal(firstSentence("One idea. Then another."), "One idea.");
  assert.equal(firstSentence("  No full stop at all  "), "No full stop at all");
  assert.equal(firstSentence("Is it? Yes."), "Is it?");
  assert.equal(firstSentence("v1.2 is out. Next."), "v1.2 is out.", "a dot inside a word isn't an end");
  const long = "word ".repeat(60).trim();
  assert.ok(firstSentence(long).length <= 161);
  assert.ok(firstSentence(long).endsWith("…"));
});
