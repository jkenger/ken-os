import assert from "node:assert/strict";
import { test } from "node:test";
import { stepPosition, stepsForTopic, topicSteps, type StepInput } from "./steps";

const base: StepInput = {
  status: "NOT_STARTED", reviewDue: false, hasLesson: false, skipLesson: false,
  practice: { predicts: 0, solid: 0 }, labs: { total: 1, passed: 0 }, check: { total: 0, answered: 0, solid: 0 },
};

test("a fresh topic suggests Learn and shows every step", () => {
  const { steps, suggested } = topicSteps(base);
  assert.deepEqual(steps.map((step) => step.id), ["learn", "practice", "lab", "check"]);
  assert.equal(suggested, "learn");
  assert.equal(steps[0].detail, "Not written yet");
});

test("after the lesson, unfinished practice is suggested next", () => {
  const { steps, suggested } = topicSteps({ ...base, hasLesson: true, practice: { predicts: 2, solid: 1 } });
  assert.equal(suggested, "practice");
  assert.equal(steps[1].detail, "1 of 2 right");
  assert.deepEqual(stepPosition(steps, suggested), { number: 2, total: 4 });
});

test("a baseline-solid topic can skip straight past Learn and Practice", () => {
  const { suggested } = topicSteps({ ...base, skipLesson: true });
  assert.equal(suggested, "lab");
});

test("topics without labs or Assessor questions drop those steps", () => {
  const noLab = topicSteps({ ...base, labs: { total: 0, passed: 0 } });
  assert.deepEqual(noLab.steps.map((step) => step.id), ["learn", "practice", "check"]);
  const labsOnly = topicSteps({ ...base, check: null });
  assert.deepEqual(labsOnly.steps.map((step) => step.id), ["learn", "practice", "lab"]);
});

test("a review or a slipped topic always points at the final step", () => {
  assert.equal(topicSteps({ ...base, status: "NEEDS_REVISIT" }).suggested, "check");
  assert.equal(topicSteps({ ...base, status: "VALIDATED", reviewDue: true, check: null }).suggested, "lab");
});

test("Check is done only when every answer in the set is solid", () => {
  const partly = topicSteps({ ...base, hasLesson: true, labs: { total: 1, passed: 1 }, check: { total: 2, answered: 2, solid: 1 } });
  assert.equal(partly.steps[3].done, false);
  assert.equal(partly.steps[3].detail, "1 of 2 solid");
  assert.equal(partly.suggested, "check");
});

test("the shared builder reads steps from a topic view the same way for Today and the topic page", () => {
  const view = {
    progress: { status: "LEARNING" as const }, reviewDue: false,
    lesson: { practice: [{ kind: "predict" }, { kind: "think" }, { kind: "predict" }] },
    practiceResults: { 0: { label: "solid" } }, passedLabs: [],
    assessment: { items: [{ answered: { label: "solid", voided: false } }, { answered: null }] },
  };
  const { steps, suggested } = stepsForTopic(view, [{ id: "lab-a", modes: ["debug"] }], ["predict", "explain", "debug"], false);
  assert.equal(suggested, "practice");
  assert.equal(steps.find((step) => step.id === "practice")?.detail, "1 of 2 right");
  assert.equal(steps.find((step) => step.id === "check")?.detail, "1 of 2 answered");
  const labOnly = stepsForTopic(view, [{ id: "lab-a", modes: ["predict", "explain"] }], ["predict", "explain"], false);
  assert.equal(labOnly.steps.some((step) => step.id === "check"), false, "no Check step when labs prove every mode");
});
