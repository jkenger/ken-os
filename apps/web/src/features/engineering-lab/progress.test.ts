import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canProve,
  computeProgress,
  isReviewDue,
  nextIntervalDays,
  type Label,
  type TopicEvent,
  type TopicEventKind,
} from "@ken-os/domain";

// Topic states and review dates (docs/architecture/engineering-rebuild.md, sections 2 and 3).

const topicId = "rel.retry_backoff";
let clock = Date.UTC(2026, 9, 10);
function event(kind: TopicEventKind, extra: { passed?: boolean; label?: Label } = {}): TopicEvent {
  clock += 60_000;
  return {
    id: String(clock),
    topicId,
    kind,
    passed: extra.passed ?? null,
    label: extra.label ?? null,
    createdAt: new Date(clock),
  };
}
const states = (events: TopicEvent[]) => computeProgress(topicId, events).state;

test("a topic moves Not started, Learning, Practicing, Proven", () => {
  const opened = event("lesson_opened");
  const ran = event("exercise_run", { passed: false });
  const passed = event("exercise_run", { passed: true });
  const proof = event("proof", { passed: true, label: "solid" });
  assert.equal(states([]), "NOT_STARTED");
  assert.equal(states([opened]), "LEARNING");
  assert.equal(states([opened, ran]), "PRACTICING");
  assert.equal(states([opened, ran, passed]), "PRACTICING", "passing the exercise never proves a topic");
  assert.equal(states([opened, ran, passed, proof]), "PROVEN");
});

test("reading a lesson never proves a topic, and a proof needs the exercise passed first", () => {
  assert.equal(states([event("lesson_opened"), event("proof", { passed: true, label: "solid" })]), "LEARNING");
  assert.equal(
    states([event("exercise_run", { passed: false }), event("proof", { passed: true, label: "solid" })]),
    "PRACTICING",
  );
});

test("a missed proof keeps the topic where it was", () => {
  const progress = computeProgress(topicId, [
    event("exercise_run", { passed: true }),
    event("proof", { passed: false, label: "partial" }),
  ]);
  assert.equal(progress.state, "PRACTICING");
  assert.equal(progress.lastLabel, "partial");
  assert.equal(canProve(progress), true, "Try again stays open");
});

test("opening the solution closes Prove until the exercise passes again", () => {
  const passed = event("exercise_run", { passed: true });
  const solution = event("solution_opened");
  const progress = computeProgress(topicId, [passed, solution]);
  assert.equal(canProve(progress), false);
  assert.equal(progress.solutionOpened, true);
  assert.equal(
    states([passed, solution, event("proof", { passed: true, label: "solid" })]),
    "PRACTICING",
    "a proof after the solution doesn't count",
  );
  const again = computeProgress(topicId, [passed, solution, event("exercise_run", { passed: true })]);
  assert.equal(canProve(again), true);
  assert.equal(again.solutionOpened, false);
});

test("Proven never goes back, and a bad review only brings the topic back sooner", () => {
  const proven = [event("exercise_run", { passed: true }), event("proof", { passed: true, label: "solid" })];
  const first = computeProgress(topicId, proven);
  assert.equal(first.reviewIntervalDays, 3);
  assert.equal(first.nextReviewAt, new Date(new Date(first.provenAt!).getTime() + 3 * 86_400_000).toISOString());
  const bad = computeProgress(topicId, [...proven, event("review", { label: "misconception" })]);
  assert.equal(bad.state, "PROVEN");
  assert.equal(bad.reviewIntervalDays, 1);
  assert.equal(computeProgress(topicId, [...proven, event("solution_opened")]).state, "PROVEN");
});

test("review gaps come from the grade", () => {
  assert.equal(nextIntervalDays(3, "solid"), 6);
  assert.equal(nextIntervalDays(60, "solid"), 90, "capped at 90 days");
  assert.equal(nextIntervalDays(12, "partial"), 12);
  assert.equal(nextIntervalDays(12, "rusty"), 3);
  assert.equal(nextIntervalDays(12, "gap"), 1);
  assert.equal(nextIntervalDays(0, "solid"), 6, "a first review starts from the 3-day gap");
});

test("a review is due once its date has passed", () => {
  const progress = computeProgress(topicId, [
    event("exercise_run", { passed: true }),
    event("proof", { passed: true, label: "solid" }),
  ]);
  assert.equal(isReviewDue(progress, new Date(progress.provenAt!)), false);
  assert.equal(isReviewDue(progress, new Date(new Date(progress.provenAt!).getTime() + 4 * 86_400_000)), true);
});

test("events for other topics are ignored", () => {
  const other = { ...event("lesson_opened"), topicId: "js.closures" };
  assert.equal(states([other]), "NOT_STARTED");
});
