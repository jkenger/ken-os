import assert from "node:assert/strict";
import { test } from "node:test";
import { areaScores, combinePredictGrade, runPosition, weakerLabel } from "@ken-os/domain";
import { assessment } from "./curriculum";

// The 5-question assessment (docs/architecture/engineering-rebuild.md, section 3).

const [microtasks] = assessment.questions;

test("questions go in order, and a saved answer must be graded before the next opens", () => {
  assert.deepEqual(runPosition(5, []), { kind: "question", index: 0 });
  assert.deepEqual(runPosition(5, [{ questionIndex: 0, label: "solid" }]), { kind: "question", index: 1 });
  assert.deepEqual(runPosition(5, [{ questionIndex: 0, label: "solid" }, { questionIndex: 1, label: null }]), { kind: "grading", index: 1 });
  assert.deepEqual(runPosition(2, [{ questionIndex: 0, label: "gap" }, { questionIndex: 1, label: "partial" }]), { kind: "done" });
});

test("the predict question compares the output first, then takes the reason's grade", () => {
  const reason = { label: "solid" as const, rubric: [{ point: microtasks.rubric[1], result: "covered" as const }], feedback: "Names the microtask rule." };
  const right = combinePredictGrade(microtasks, ["A", "C", "B"], reason);
  assert.equal(right.label, "solid");
  assert.deepEqual(right.rubric.map((line) => line.result), ["covered", "covered"]);
  assert.equal(right.rubric[0].point, "Prints A, C, B");

  const reordered = combinePredictGrade(microtasks, ["A", "B", "C"], reason);
  assert.equal(reordered.label, "misconception", "right lines in the wrong order");
  assert.equal(reordered.rubric[0].result, "missed");
  assert.match(reordered.feedback, /printed A, C, B/);

  const weakReason = combinePredictGrade(microtasks, ["A", "C", "B"], { ...reason, label: "partial", rubric: [{ point: microtasks.rubric[1], result: "partly" }] });
  assert.equal(weakReason.label, "partial", "a right output with a vague reason is partly there");
});

test("the weaker of two grades wins", () => {
  assert.equal(weakerLabel("solid", "gap"), "gap");
  assert.equal(weakerLabel("rusty", "partial"), "rusty");
});

test("area scores come from the run's grades, lower is weaker", () => {
  const scores = areaScores(assessment.questions, [{ questionIndex: 0, label: "solid" }, { questionIndex: 2, label: "gap" }, { questionIndex: 3, label: null }]);
  assert.deepEqual(scores, { foundations: 4, backend: 0 });
});
