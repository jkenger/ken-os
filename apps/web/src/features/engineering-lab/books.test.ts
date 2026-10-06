import assert from "node:assert/strict";
import { test } from "node:test";
import { attachPoints, POINTS_PER_TOPIC, type TopicMap } from "@ken-os/domain";
import { pointsReview, topicMap } from "./generated/curriculum.generated";

// Books and assessment points (docs/architecture/engineering-assessment-v2.md, A6).

test("every chapter is in exactly one book, in reading order", () => {
  const placed = topicMap.books.flatMap((book) => book.chapters);
  for (const module of topicMap.modules) assert.equal(placed.filter((id) => id === module.id).length, 1, module.id);
  assert.deepEqual(topicMap.books.map((book) => book.id), ["web-foundations", "react-foundations", "backend-data", "production-engineering", "ai-engineering"]);
});

test("every written topic carries 4 to 6 assessment points", () => {
  for (const topic of topicMap.topics) {
    assert.ok(topic.points.length >= POINTS_PER_TOPIC.min && topic.points.length <= POINTS_PER_TOPIC.max, `${topic.id} has ${topic.points.length}`);
    assert.ok(topic.points.every((point) => !point.includes("—")), `${topic.id}: no em dashes`);
  }
});

test("approved points carry a review date", () => {
  // Widened on purpose: the generated value is a literal, and the rule must hold whichever status it has.
  const review: { status: string; reviewedOn: string | null } = pointsReview;
  assert.ok(review.status !== "approved" || review.reviewedOn, "approved points carry a review date");
});

test("attachPoints rejects unknown topics and the wrong number of points", () => {
  const map: TopicMap = { ...topicMap, topics: topicMap.topics.map((topic) => ({ ...topic, points: [] })) };
  const full = Object.fromEntries(topicMap.topics.map((topic) => [topic.id, topic.points]));
  assert.doesNotThrow(() => attachPoints(map, { status: "draft", topics: full }));
  assert.throws(() => attachPoints(map, { topics: { ...full, "js.unknown": ["A point long enough"] } }), /unknown topic/);
  assert.throws(() => attachPoints(map, { topics: { ...full, "js.call_stack": ["Only one point here"] } }), /expected 4 to 6/);
  assert.throws(() => attachPoints(map, { status: "approved", topics: full }), /reviewedOn/);
});
