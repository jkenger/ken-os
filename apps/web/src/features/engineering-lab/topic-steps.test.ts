import assert from "node:assert/strict";
import { test } from "node:test";
import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";
import { chapterDone, nextTopic, topicSteps } from "./topic-steps";

// The path inside a topic, Next topic and chapter done (docs/architecture/engineering-progressive-flow.md, sections 2
// and 3).

const topic = (id: string, status: TopicStatus = "not_started") => ({
  id,
  title: id.toUpperCase(),
  custom: false,
  status,
  changedAt: null,
  learnedAt: null,
});
const chapter = (id: string, topics: ReturnType<typeof topic>[]): RoadmapChapter => ({
  id,
  title: `Chapter ${id}`,
  area: "Area",
  topics,
});

const states = (steps: ReturnType<typeof topicSteps>) => steps.steps.map((step) => `${step.id}:${step.state}`);

test("a new topic starts at Learn, with Practice optional", () => {
  const steps = topicSteps({ status: "not_started", practice: "not_tried" });
  assert.deepEqual(states(steps), ["learn:todo", "practice:optional"]);
  assert.equal(steps.main, "learn");
});

test("once Claude has started, Practice is next until a run passes, then back to the chat", () => {
  assert.equal(topicSteps({ status: "in_progress", practice: "not_tried" }).main, "practice");
  assert.equal(topicSteps({ status: "in_progress", practice: "tried" }).main, "practice", "a failing run isn't done");
  const passed = topicSteps({ status: "in_progress", practice: "passed" });
  assert.deepEqual(states(passed), ["learn:done", "practice:done"]);
  assert.equal(passed.main, "learn");
  const none = topicSteps({ status: "in_progress", practice: "none" });
  assert.deepEqual(states(none), ["learn:done", "practice:none"]);
  assert.equal(none.main, "learn");
});

test("Learned and Skipped topics are finished, and point to the next topic", () => {
  const learned = topicSteps({ status: "learned", practice: "not_tried" });
  assert.deepEqual(states(learned), ["learn:done", "practice:optional"]);
  assert.equal(learned.main, "next");
  const skipped = topicSteps({ status: "skipped", practice: "none" });
  assert.deepEqual(states(skipped), ["learn:skipped", "practice:none"]);
  assert.equal(skipped.main, "next");
});

test("the next topic is the next unfinished one in roadmap order, wrapping to earlier ones", () => {
  const chapters = [
    chapter("a", [topic("a1", "learned"), topic("a2"), topic("a3", "skipped")]),
    chapter("b", [topic("b1", "learned"), topic("b2", "in_progress")]),
  ];
  assert.equal(nextTopic(chapters, "a1")?.id, "a2");
  assert.equal(nextTopic(chapters, "a2")?.id, "b2", "skips Learned and Skipped, across chapters");
  assert.equal(nextTopic(chapters, "b2")?.id, "a2", "wraps to the start");
  assert.equal(nextTopic(chapters, "b2")?.title, "A2");
  assert.equal(nextTopic([chapter("a", [topic("a1", "learned"), topic("a2", "skipped")])], "a1"), null);
  assert.equal(nextTopic(chapters, "elsewhere")?.id, "a2", "a topic off the roadmap starts from the top");
});

test("a chapter is done when every topic in it is Learned or Skipped", () => {
  const chapters = [
    chapter("a", [topic("a1", "learned"), topic("a2", "skipped")]),
    chapter("b", [topic("b1", "learned"), topic("b2", "in_progress")]),
  ];
  assert.deepEqual(chapterDone(chapters, "a1"), { title: "Chapter a", learned: 1, total: 2 });
  assert.equal(chapterDone(chapters, "b1"), null);
  assert.equal(chapterDone(chapters, "elsewhere"), null);
});
