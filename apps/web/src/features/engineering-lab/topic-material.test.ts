import assert from "node:assert/strict";
import { test } from "node:test";
import type { TopicStatus } from "@ken-os/domain";
import {
  brokenLinks,
  formatMinutes,
  mergePlans,
  topicMaterialInput,
  topicPlanInput,
  waitingOn,
  withMaterial,
  type TopicPlan,
} from "./topic-material";

// Claude's material for a topic (docs/architecture/roadmap-ui.md, "Topic panel: what comes next").

const onRoadmap = ["a", "b", "c", "d"];
const plan = (overrides: Partial<TopicPlan> = {}): TopicPlan => ({
  prerequisites: [],
  related: [],
  minutes: null,
  difficulty: null,
  ...overrides,
});

test("a plan save sets each topic's prerequisites, related topics, estimate and difficulty", () => {
  const merged = mergePlans(onRoadmap, {}, [
    { topicId: "b", prerequisites: ["a"], related: ["c"], minutes: 25, difficulty: "easy" },
  ]);
  assert.deepEqual(merged, { b: plan({ prerequisites: ["a"], related: ["c"], minutes: 25, difficulty: "easy" }) });
});

test("a correction changes only the fields it sends, and leaves other topics alone", () => {
  const existing = {
    b: plan({ prerequisites: ["a"], minutes: 25, difficulty: "easy" }),
    c: plan({ minutes: 40 }),
  };
  const merged = mergePlans(onRoadmap, existing, [{ topicId: "b", minutes: 45 }]);
  assert.deepEqual(merged.b, plan({ prerequisites: ["a"], minutes: 45, difficulty: "easy" }));
  assert.deepEqual(merged.c, existing.c);
  assert.notEqual(merged, existing, "the saved plans are not changed in place");
});

test("topics, prerequisites and related topics must be on the roadmap, and never the topic itself", () => {
  assert.throws(() => mergePlans(onRoadmap, {}, [{ topicId: "x" }]), /x isn't on this roadmap/);
  assert.throws(() => mergePlans(onRoadmap, {}, [{ topicId: "b", prerequisites: ["x"] }]), /x isn't on this roadmap/);
  assert.throws(() => mergePlans(onRoadmap, {}, [{ topicId: "b", related: ["y"] }]), /y isn't on this roadmap/);
  assert.throws(() => mergePlans(onRoadmap, {}, [{ topicId: "b", prerequisites: ["b"] }]), /b can't depend on itself/);
  assert.throws(() => mergePlans(onRoadmap, {}, [{ topicId: "b", related: ["b"] }]), /b can't be related to itself/);
});

test("a save that makes prerequisites loop is refused, naming the loop", () => {
  const existing = { b: plan({ prerequisites: ["a"] }), c: plan({ prerequisites: ["b"] }) };
  assert.throws(() => mergePlans(onRoadmap, existing, [{ topicId: "a", prerequisites: ["c"] }]), /Loop: a → c → b → a/);
});

test("waiting on: the prerequisites not yet Learned or Skipped, in order", () => {
  const statuses: Record<string, TopicStatus> = { a: "learned", b: "in_progress", c: "skipped", d: "not_started" };
  const statusOf = (topicId: string) => statuses[topicId];
  assert.deepEqual(waitingOn(plan({ prerequisites: ["a", "b", "c", "d"] }), statusOf), ["b", "d"]);
  assert.deepEqual(waitingOn(plan({ prerequisites: ["a", "c"] }), statusOf), []);
  assert.deepEqual(waitingOn(undefined, statusOf), []);
});

test("estimates read as minutes, then hours", () => {
  assert.equal(formatMinutes(25), "~25 min");
  assert.equal(formatMinutes(60), "~1 h");
  assert.equal(formatMinutes(90), "~1 h 30 min");
});

test("the plan input takes known difficulties and sensible estimates only", () => {
  assert.equal(topicPlanInput.safeParse({ topicId: "a", difficulty: "brutal" }).success, false);
  assert.equal(topicPlanInput.safeParse({ topicId: "a", minutes: 2 }).success, false);
  assert.equal(topicPlanInput.safeParse({ topicId: "a", minutes: 25, difficulty: "medium" }).success, true);
});

const material = {
  topicId: "a",
  description: "When React re-renders and why",
  tasks: { read: "Read Render and Commit", build: "Build a list that breaks with index keys", explain: "Explain it" },
  resources: [{ title: "Render and Commit", url: "https://react.dev/learn/render-and-commit", kind: "docs" }],
  criteria: ["One", "Two", "Three"],
};

test("material needs a description, wording for all three tasks, https links and 3 to 6 criteria", () => {
  assert.equal(topicMaterialInput.safeParse(material).success, true);
  assert.equal(topicMaterialInput.safeParse({ ...material, criteria: ["One", "Two"] }).success, false);
  assert.equal(
    topicMaterialInput.safeParse({ ...material, resources: [{ ...material.resources[0], url: "http://x.dev" }] })
      .success,
    false,
  );
  assert.equal(
    topicMaterialInput.safeParse({ ...material, tasks: { read: "Read", build: "Build" } }).success,
    false,
    "every topic has the same three tasks",
  );
});

test("made-up links are reported: an error status, or a site that doesn't exist; a slow site is not", async () => {
  const answers: Record<string, number | "no-such-site" | "slow"> = {
    "https://ok.dev": 200,
    "https://moved.dev": 301,
    "https://gone.dev": 404,
    "https://made-up.dev": "no-such-site",
    "https://nohead.dev": 405,
    "https://slow.dev": "slow",
  };
  const fetcher = async (url: string, init?: { method?: string }) => {
    const answer = answers[url];
    if (answer === "no-such-site") throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ENOTFOUND" } });
    if (answer === "slow") throw new DOMException("The operation timed out", "TimeoutError");
    // Some sites refuse HEAD; the check then tries GET.
    if (url === "https://nohead.dev" && init?.method === "GET") return { ok: true, status: 200 };
    return { ok: answer < 400, status: answer };
  };
  assert.deepEqual(await brokenLinks(Object.keys(answers), fetcher), ["https://gone.dev", "https://made-up.dev"]);
});

test("once Claude writes material, its criteria and description replace the topic's points and line", () => {
  const topic = { id: "a", gap: "Old line", points: ["Old one", "Old two", "Old three", "Old four", "Old five"] };
  const written = { ...material, criteria: ["New one", "New two", "New three"] };
  assert.deepEqual(withMaterial(topic, written), {
    id: "a",
    gap: material.description,
    points: ["New one", "New two", "New three"],
  });
  assert.equal(withMaterial(topic, null), topic, "until then, the old material stays as the fallback");
});
