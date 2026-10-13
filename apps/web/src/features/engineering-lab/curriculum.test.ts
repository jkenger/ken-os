import assert from "node:assert/strict";
import { test } from "node:test";
import { attachPoints, POINTS_PER_TOPIC, type TopicMap } from "@ken-os/domain";
import { labs, pointsReview, topicMap } from "./generated/curriculum.generated";

// The curriculum and its assessment points (docs/architecture/engineering-rebuild.md, section 1).

const COURSE: Record<string, Record<string, string[]>> = {
  foundations: {
    "js-runtime": ["js.call_stack", "js.promises", "js.event_loop", "js.closures"],
    "http-browser": ["web.http_semantics", "web.cookies_cors", "web.http_caching"],
  },
  frontend: { react: ["react.render_model", "react.effects", "react.component_boundaries"] },
  backend: {
    "api-boundaries": ["api.runtime_validation", "sec.resource_authorization", "api.error_contracts"],
    databases: ["db.transactions", "db.composite_indexes", "db.concurrency"],
  },
  production: {
    "testing-security": ["test.strategy", "sec.injection", "sec.sessions"],
    reliability: ["rel.background_jobs", "rel.retry_backoff", "rel.timeouts", "rel.partial_failures"],
    observability: ["obs.logs", "obs.traces", "obs.metrics"],
    architecture: ["arch.failure_tradeoffs", "arch.service_boundaries"],
  },
  ai: {
    retrieval: ["ai.semantic_search", "ai.chunking", "ai.advanced_rag", "ai.retrieval_eval"],
    "model-interfaces": ["ai.structured_outputs", "ai.tool_calling"],
    agents: ["ai.agent_patterns", "ai.agent_memory", "ai.mcp"],
    "ai-production": ["ai.evals", "ai.model_routing", "ai.cost_latency"],
  },
};

test("the course is exactly 5 areas, 13 chapters and 40 topics, in order", () => {
  assert.deepEqual(
    topicMap.areas.map((area) => area.id),
    Object.keys(COURSE),
  );
  for (const area of topicMap.areas) assert.deepEqual(area.chapters, Object.keys(COURSE[area.id]), area.id);
  assert.equal(topicMap.chapters.length, 13);
  const expected = Object.values(COURSE).flatMap((chapters) =>
    Object.entries(chapters).flatMap(([chapter, ids]) => ids.map((id) => `${chapter} ${id}`)),
  );
  assert.deepEqual(
    topicMap.topics.map((topic) => `${topic.chapter} ${topic.id}`),
    expected,
  );
});

test("every topic has exactly one exercise, and every exercise belongs to a topic", () => {
  for (const topic of topicMap.topics) assert.equal(topic.labs.length, 1, topic.id);
  const used = new Set(topicMap.topics.flatMap((topic) => topic.labs));
  assert.deepEqual(
    labs.map((lab) => lab.id).filter((id) => !used.has(id)),
    [],
  );
  assert.equal(labs.length, 39, "39 labs; event-loop-order serves two topics");
  for (const lab of labs)
    for (const topicId of lab.topics)
      assert.ok(
        topicMap.topics.find((topic) => topic.id === topicId)!.labs.includes(lab.id),
        `${lab.id} lists ${topicId}`,
      );
});

test("every written topic carries 4 to 6 assessment points", () => {
  for (const topic of topicMap.topics) {
    assert.ok(
      topic.points.length >= POINTS_PER_TOPIC.min && topic.points.length <= POINTS_PER_TOPIC.max,
      `${topic.id} has ${topic.points.length}`,
    );
    assert.ok(
      topic.points.every((point) => !point.includes("—")),
      `${topic.id}: no em dashes`,
    );
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
  assert.throws(
    () => attachPoints(map, { topics: { ...full, "js.unknown": ["A point long enough"] } }),
    /unknown topic/,
  );
  assert.throws(
    () => attachPoints(map, { topics: { ...full, "js.call_stack": ["Only one point here"] } }),
    /expected 4 to 6/,
  );
  assert.throws(() => attachPoints(map, { status: "approved", topics: full }), /reviewedOn/);
});
