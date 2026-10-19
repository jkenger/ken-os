import assert from "node:assert/strict";
import { test } from "node:test";
import type { TopicStatus } from "@ken-os/domain";
import type { RoadmapChapter } from "./roadmap-store";
import { chapterDone, nextTopic, topicTasks } from "./topic-steps";

// A topic's tasks, Next topic and chapter done (docs/architecture/engineering-progressive-flow.md, sections 2 and 3,
// and docs/architecture/roadmap-ui.md).

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

const states = (tasks: ReturnType<typeof topicTasks>) => tasks.tasks.map((task) => `${task.id}:${task.state}`);

test("a new topic has Read, Build and Explain to do, starting with Read", () => {
  const tasks = topicTasks({ status: "not_started", practice: "not_tried" });
  assert.deepEqual(states(tasks), ["read:todo", "build:todo", "explain:todo"]);
  assert.deepEqual([tasks.done, tasks.total], [0, 3]);
  assert.equal(tasks.main, "read");
});

test("Read is done once Claude has started; Build is next until a run passes, then Explain", () => {
  const started = topicTasks({ status: "in_progress", practice: "not_tried" });
  assert.deepEqual(states(started), ["read:done", "build:todo", "explain:todo"]);
  assert.equal(started.main, "build");
  assert.equal(topicTasks({ status: "in_progress", practice: "tried" }).main, "build", "a failing run isn't done");
  const passed = topicTasks({ status: "in_progress", practice: "passed" });
  assert.deepEqual(states(passed), ["read:done", "build:done", "explain:todo"]);
  assert.deepEqual([passed.done, passed.main], [2, "explain"]);
});

test("without an exercise, Build waits on one and Explain is next", () => {
  const tasks = topicTasks({ status: "in_progress", practice: "none" });
  assert.deepEqual(states(tasks), ["read:done", "build:none", "explain:todo"]);
  assert.deepEqual([tasks.done, tasks.total, tasks.main], [1, 3, "explain"]);
});

test("Claude's first exercise waiting for its check is Build to do, so Try it in code can check it", () => {
  const tasks = topicTasks({ status: "in_progress", practice: "checking" });
  assert.deepEqual(states(tasks), ["read:done", "build:todo", "explain:todo"]);
  assert.equal(tasks.main, "build");
});

test("Explain is done when the topic is Learned, and a finished topic points to the next one", () => {
  const learned = topicTasks({ status: "learned", practice: "passed" });
  assert.deepEqual(states(learned), ["read:done", "build:done", "explain:done"]);
  assert.deepEqual([learned.done, learned.main], [3, "next"]);
  const skipped = topicTasks({ status: "skipped", practice: "none" });
  assert.deepEqual(states(skipped), ["read:skipped", "build:skipped", "explain:skipped"]);
  assert.deepEqual([skipped.done, skipped.main], [0, "next"]);
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
