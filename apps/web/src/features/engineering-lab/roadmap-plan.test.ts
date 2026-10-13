import assert from "node:assert/strict";
import { test } from "node:test";
import { topicMap } from "./curriculum";
import { customId, normalizePlan, PlanError } from "./roadmap-plan";

// Checking a roadmap Claude proposes (docs/architecture/engineering-claude-first.md, section 3).

const none = new Set<string>();
const effects = { chapterId: "react", topics: ["react.effects"] };

test("map chapters keep their reviewed titles and topics", () => {
  const plan = normalizePlan({ goal: "  Frontend   developer ", chapters: [effects] }, topicMap, none);
  assert.equal(plan.goal, "Frontend developer");
  assert.equal(plan.chapters[0].id, "react");
  assert.equal(plan.chapters[0].title, topicMap.chapters.find((chapter) => chapter.id === "react")!.title);
  assert.deepEqual(plan.chapters[0].topicIds, ["react.effects"]);
  assert.deepEqual(plan.newTopics, []);
});

test("Claude can add chapters and topics, each topic with 3 to 5 lines to explain", () => {
  const plan = normalizePlan(
    {
      goal: "AI engineer",
      chapters: [
        {
          title: "Evals in practice",
          topics: [
            "react.effects",
            { title: "LLM-as-judge", explain: ["What a judge model scores", "Why it drifts", "How to calibrate it"] },
          ],
        },
      ],
    },
    topicMap,
    none,
  );
  assert.equal(plan.chapters[0].id, "custom.evals_in_practice");
  assert.deepEqual(plan.chapters[0].topicIds, ["react.effects", "custom.llm_as_judge"]);
  assert.deepEqual(plan.newTopics, [
    {
      id: "custom.llm_as_judge",
      title: "LLM-as-judge",
      lines: ["What a judge model scores", "Why it drifts", "How to calibrate it"],
    },
  ]);
});

test("ids never collide with earlier topics, and a reused custom id is accepted", () => {
  const earlier = new Set(["custom.llm_as_judge"]);
  const plan = normalizePlan(
    {
      goal: "AI engineer",
      chapters: [
        {
          title: "Evals",
          topics: ["custom.llm_as_judge", { title: "LLM as judge", explain: ["One", "Two", "Three"] }],
        },
      ],
    },
    topicMap,
    earlier,
  );
  assert.deepEqual(plan.chapters[0].topicIds, ["custom.llm_as_judge", "custom.llm_as_judge_2"]);
  assert.equal(customId("  !!! "), "custom.topic");
});

test("broken plans come back with a message Claude can act on", () => {
  const plan =
    (chapters: Parameters<typeof normalizePlan>[0]["chapters"], goal = "Goal") =>
    () =>
      normalizePlan({ goal, chapters }, topicMap, none);
  assert.throws(plan([]), /at least one chapter/);
  assert.throws(plan([effects], ""), /Name the goal/);
  assert.throws(plan([{ chapterId: "nope", topics: ["react.effects"] }]), /no chapter "nope"/);
  assert.throws(plan([{ topics: ["react.effects"] }]), /or a title for a new chapter/);
  assert.throws(plan([{ chapterId: "react", topics: ["react.nope"] }]), /no topic "react.nope"/);
  assert.throws(plan([effects, { chapterId: "js-runtime", topics: ["react.effects"] }]), /in the roadmap twice/);
  assert.throws(plan([{ title: "New", topics: [{ title: "Thin", explain: ["One", "Two"] }] }]), /3 to 5 lines/);
  assert.throws(plan([{ chapterId: "react", topics: [] }]), /at least one topic/);
  assert.ok(new PlanError("x") instanceof Error);
});
