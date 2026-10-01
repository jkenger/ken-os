import assert from "node:assert/strict";
import { test } from "node:test";
import { computeProgress, gradeLabRun, gradePrediction, parsePredictedLines, parseTopicMap, planNext, type AttemptRecord, type Label, type Mode, type TopicProgress } from "@ken-os/domain";
import { assessorModes, baselineAttempts, findTopic, labs, topicMap } from "./curriculum";

let counter = 0;
function attempt(topicId: string, mode: Mode, label: Label, overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  counter += 1;
  return {
    id: `a${counter}`, topicId, kind: "assessment", mode, label,
    gradedBy: mode === "predict" ? "code" : "assessor", voided: false, selfRating: 3,
    misconceptions: [], solutionSeen: false, createdAt: new Date(Date.UTC(2026, 9, 2, 0, counter)),
    ...overrides,
  };
}

function progressFor(attempts: AttemptRecord[], started = new Set<string>()): TopicProgress[] {
  const all = [...baselineAttempts(), ...attempts];
  return topicMap.topics.map((topic) => computeProgress(topic, all, started.has(topic.id)).progress);
}

const eventLoop = findTopic("js.event_loop")!;
const now = new Date(Date.UTC(2026, 9, 2));

test("baseline alone starts nothing and proves nothing", () => {
  const progress = progressFor([]);
  assert.ok(progress.every((item) => item.status === "NOT_STARTED"));
  const eventLoopProgress = progress.find((item) => item.topicId === "js.event_loop")!;
  assert.equal(eventLoopProgress.baselineLabel, "misconception");
  assert.deepEqual(eventLoopProgress.weaknesses, ["Code runs top to bottom, with timers and promises as the same kind of async work", "setTimeout(..., 0) runs before promise callbacks"]);
});

test("the Planner starts with the event loop's prerequisite on the real baseline", () => {
  const plan = planNext({ map: topicMap, progress: progressFor([]), latestLabel: {}, now });
  assert.equal(plan?.topicId, "js.call_stack");
  assert.equal(plan?.kind, "new");
  assert.equal(plan?.skipLesson, false);
});

test("reading a lesson moves a topic to LEARNING and no further", () => {
  const { progress } = computeProgress(eventLoop, baselineAttempts(), true);
  assert.equal(progress.status, "LEARNING");
  assert.deepEqual(progress.evidence, {});
});

test("validation needs every proof mode solid from assessments, with one checked by code", () => {
  const lessonOnly = [attempt("js.event_loop", "predict", "solid", { kind: "lesson" }), attempt("js.event_loop", "explain", "solid", { kind: "lesson" }), attempt("js.event_loop", "debug", "solid", { kind: "lesson" })];
  assert.equal(computeProgress(eventLoop, lessonOnly, true).progress.status, "PRACTICING");

  const proof = [attempt("js.event_loop", "predict", "solid"), attempt("js.event_loop", "explain", "solid"), attempt("js.event_loop", "debug", "solid", { kind: "lab", gradedBy: "code" })];
  const { progress, changes } = computeProgress(eventLoop, proof, true);
  assert.equal(progress.status, "VALIDATED");
  assert.equal(changes.at(-1)?.to, "VALIDATED");
  assert.equal(progress.nextReviewAt, new Date(proof[2].createdAt.getTime() + 3 * 86_400_000).toISOString());
});

test("a lab passed after seeing the solution does not count", () => {
  const proof = [attempt("js.event_loop", "predict", "solid"), attempt("js.event_loop", "explain", "solid"), attempt("js.event_loop", "debug", "solid", { kind: "lab", gradedBy: "code", solutionSeen: true })];
  assert.equal(computeProgress(eventLoop, proof, true).progress.status, "PRACTICING");
});

test("voided questions never count", () => {
  const proof = [attempt("js.event_loop", "predict", "solid", { voided: true }), attempt("js.event_loop", "explain", "solid"), attempt("js.event_loop", "debug", "solid", { kind: "lab", gradedBy: "code" })];
  assert.equal(computeProgress(eventLoop, proof, true).progress.status, "PRACTICING");
});

test("a failed check after validation sets NEEDS_REVISIT, and the Planner brings it back first", () => {
  const proof = [attempt("js.event_loop", "predict", "solid"), attempt("js.event_loop", "explain", "solid"), attempt("js.event_loop", "debug", "solid", { kind: "lab", gradedBy: "code" })];
  const slip = attempt("js.event_loop", "predict", "misconception", { kind: "review" });
  const { progress } = computeProgress(eventLoop, [...proof, slip], true);
  assert.equal(progress.status, "NEEDS_REVISIT");
  const plan = planNext({ map: topicMap, progress: [progress], latestLabel: {}, now });
  assert.equal(plan?.kind, "review");
  assert.equal(plan?.topicId, "js.event_loop");
});

test("a passed review on time moves to the next gap", () => {
  const proof = [attempt("js.event_loop", "predict", "solid"), attempt("js.event_loop", "explain", "solid"), attempt("js.event_loop", "debug", "solid", { kind: "lab", gradedBy: "code" })];
  const later = new Date(proof[2].createdAt.getTime() + 4 * 86_400_000);
  const review = attempt("js.event_loop", "predict", "solid", { kind: "review", createdAt: later });
  const { progress } = computeProgress(eventLoop, [...proof, review], true);
  assert.equal(progress.reviewStage, 1);
  assert.equal(progress.nextReviewAt, new Date(later.getTime() + 10 * 86_400_000).toISOString());
});

test("a misconception redirects the Planner to an unproven prerequisite", () => {
  const miss = attempt("js.event_loop", "predict", "misconception");
  const progress = progressFor([miss], new Set(["js.event_loop"]));
  const plan = planNext({ map: topicMap, progress, latestLabel: { "js.event_loop": "misconception" }, now });
  assert.equal(plan?.kind, "prerequisite");
  assert.equal(plan?.topicId, "js.call_stack");
});

test("high confidence on a misconception is flagged as overconfident", () => {
  const { progress } = computeProgress(eventLoop, [attempt("js.event_loop", "predict", "misconception", { selfRating: 5 })], true);
  assert.equal(progress.confidence.overconfident, true);
  assert.equal(progress.confidence.averageSelfRating, 5);
});

test("a later solid answer in the same mode clears a weakness", () => {
  const all = [...baselineAttempts(), attempt("js.event_loop", "predict", "solid")];
  assert.deepEqual(computeProgress(eventLoop, all, true).progress.weaknesses, []);
});

test("the Assessor leaves lab-proven modes to the lab", () => {
  assert.deepEqual(assessorModes(eventLoop), ["predict", "explain"]);
  assert.deepEqual(assessorModes(findTopic("js.async_races")!), ["explain"]);
});

test("the topic map rejects loops and proof that never touches code", () => {
  const known = new Map(labs.map((lab) => [lab.id, lab.modes]));
  const base = { id: "js.a", title: "A", module: "m", freshness: "core_concept", sourceGroups: ["javascript"], gap: "x".repeat(30), prove: ["predict"] };
  const modules = [{ id: "m", title: "M", track: "fullstack" }];
  assert.throws(() => parseTopicMap({ modules, topics: [{ ...base, requires: ["js.b"] }, { ...base, id: "js.b", requires: ["js.a"] }] }, known), /loop/);
  assert.throws(() => parseTopicMap({ modules, topics: [{ ...base, prove: ["explain"] }] }, known), /code/);
});

test("predictions are graded against the real run, and a wrong question is voided", () => {
  assert.equal(gradePrediction(parsePredictedLines("A D C B"), ["A", "D", "C", "B"], ["A", "D", "C", "B"]).label, "solid");
  assert.equal(gradePrediction(parsePredictedLines("A, B, C, D"), ["A", "D", "C", "B"], ["A", "D", "C", "B"]).label, "misconception");
  assert.equal(gradePrediction(["A"], ["A", "B"], ["B", "A"]).voided, true);
  assert.equal(gradeLabRun({ passed: 2, failed: 0, output: "" }).label, "solid");
  assert.equal(gradeLabRun({ passed: 1, failed: 1, output: "" }).label, "partial");
});
