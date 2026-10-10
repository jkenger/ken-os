import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProgress, pickPractice, type TopicProgress } from "@ken-os/domain";

// Practice selection (docs/architecture/engineering-rebuild.md, section 3, Practice).

const now = new Date("2026-10-20T00:00:00Z");
const topic = (topicId: string, extra: Partial<TopicProgress>): TopicProgress => ({ ...emptyProgress(topicId), ...extra });

test("due reviews first, then changed sources, then misconceptions, then the topic in progress", () => {
  const progress = [
    topic("a", { state: "PRACTICING", lastActivityAt: "2026-10-19T00:00:00Z" }),
    topic("b", { state: "PROVEN", nextReviewAt: "2026-10-30T00:00:00Z" }),
    topic("c", { state: "PROVEN", nextReviewAt: "2026-10-18T00:00:00Z" }),
    topic("d", { state: "LEARNING", lastLabel: "misconception", lastActivityAt: "2026-10-10T00:00:00Z" }),
    topic("e", { state: "PROVEN", nextReviewAt: "2026-10-12T00:00:00Z" }),
  ];
  assert.deepEqual(pickPractice(progress, ["b"], now), [
    { topicId: "e", reason: "due" },
    { topicId: "c", reason: "due" },
    { topicId: "b", reason: "changed" },
    { topicId: "d", reason: "misconception" },
  ]);
});

test("before anything is proven, practice draws from topics being learned", () => {
  const progress = [topic("a", { state: "LEARNING", lastActivityAt: "2026-10-01T00:00:00Z" }), topic("b", { state: "PRACTICING", lastActivityAt: "2026-10-02T00:00:00Z" }), topic("c", {})];
  assert.deepEqual(pickPractice(progress, [], now), [{ topicId: "b", reason: "active" }, { topicId: "a", reason: "active" }]);
  assert.deepEqual(pickPractice([topic("c", {})], [], now), [], "nothing started, nothing to practice");
});

test("a set holds at most 4, each topic once, and a changed source only counts for proven topics", () => {
  const many = Array.from({ length: 6 }, (_, index) => topic(`t${index}`, { state: "PROVEN", nextReviewAt: `2026-10-0${index + 1}T00:00:00Z`, lastLabel: "misconception" }));
  const picks = pickPractice(many, ["t0"], now);
  assert.equal(picks.length, 4);
  assert.equal(new Set(picks.map((pick) => pick.topicId)).size, 4);
  assert.deepEqual(pickPractice([topic("x", { state: "LEARNING" })], ["x"], now), [{ topicId: "x", reason: "active" }]);
});
