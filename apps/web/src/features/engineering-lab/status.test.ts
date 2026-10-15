import assert from "node:assert/strict";
import { test } from "node:test";
import {
  claudeMayChange,
  computeTopicStatus,
  staleLearned,
  TOPIC_STATUSES,
  type StatusEvent,
  type TopicStatus,
} from "@ken-os/domain";

// Topic statuses (docs/architecture/engineering-claude-first.md, section 2).

let clock = Date.UTC(2026, 9, 13);
function event(
  kind: StatusEvent["kind"],
  extra: { passed?: boolean; status?: TopicStatus; source?: "claude" | "ken-os" } = {},
): StatusEvent {
  clock += 60_000;
  return {
    kind,
    passed: extra.passed ?? null,
    status: extra.status ?? null,
    source: extra.source ?? "ken-os",
    createdAt: new Date(clock),
  };
}
const report = (status?: TopicStatus) => event("report", { status, source: "claude" });
const owner = (status: TopicStatus) => event("status_set", { status });

test("a topic starts Not started, and Claude's first report starts it", () => {
  assert.equal(computeTopicStatus([]).status, "not_started");
  const started = computeTopicStatus([report()]);
  assert.equal(started.status, "in_progress");
  assert.equal(started.setBy, "claude");
  assert.equal(computeTopicStatus([report(), report()]).status, "in_progress", "more reports change nothing");
});

test("Claude can mark Learned or Skipped; the owner can set anything", () => {
  const learned = computeTopicStatus([report(), report("learned")]);
  assert.equal(learned.status, "learned");
  assert.ok(learned.learnedAt);
  assert.equal(computeTopicStatus([report("skipped")]).status, "skipped");
  const undone = computeTopicStatus([report("learned"), owner("not_started")]);
  assert.equal(undone.status, "not_started");
  assert.equal(undone.setBy, "owner");
  assert.equal(undone.learnedAt, null);
});

test("Claude never overrides a status the owner set, except to start a topic the owner reset", () => {
  const skipped = computeTopicStatus([owner("skipped")]);
  assert.equal(claudeMayChange(skipped, "learned"), false);
  assert.equal(claudeMayChange(skipped, "in_progress"), false);
  const reset = computeTopicStatus([report("learned"), owner("not_started")]);
  assert.equal(claudeMayChange(reset, "in_progress"), true);
  assert.equal(claudeMayChange(reset, "learned"), false);
  assert.equal(claudeMayChange(computeTopicStatus([report()]), "learned"), true);
});

test("old work carries over: activity is In progress, a proof on a passed exercise is Learned", () => {
  assert.equal(computeTopicStatus([event("lesson_opened")]).status, "in_progress");
  assert.equal(computeTopicStatus([event("exercise_run", { passed: false })]).status, "in_progress");
  const proven = computeTopicStatus([event("exercise_run", { passed: true }), event("proof", { passed: true })]);
  assert.equal(proven.status, "learned");
  assert.equal(proven.setBy, "ken-os");
  assert.equal(
    computeTopicStatus([
      event("exercise_run", { passed: true }),
      event("solution_opened"),
      event("proof", { passed: true }),
    ]).status,
    "in_progress",
    "a proof after opening the solution never proved anything",
  );
  assert.equal(
    computeTopicStatus([event("lesson_saved"), event("exercise_saved")]).status,
    "not_started",
    "saved content isn't activity",
  );
});

test("Learned topics older than 60 days are listed for a refresh, oldest first", () => {
  const now = new Date(Date.UTC(2026, 11, 31));
  const items = [
    { id: "new", status: "learned" as const, learnedAt: "2026-12-01T00:00:00Z" },
    { id: "old", status: "learned" as const, learnedAt: "2026-09-01T00:00:00Z" },
    { id: "older", status: "learned" as const, learnedAt: "2026-08-01T00:00:00Z" },
    { id: "skipped", status: "skipped" as const, learnedAt: null },
  ];
  assert.deepEqual(
    staleLearned(items, now).map((item) => item.id),
    ["older", "old"],
  );
});

test("Claude marks a topic Ready to check once every point is taught, and Learned still follows", () => {
  const ready = computeTopicStatus([report(), report("ready_to_check")]);
  assert.equal(ready.status, "ready_to_check");
  assert.equal(ready.setBy, "claude");
  assert.equal(ready.learnedAt, null);
  assert.equal(claudeMayChange(ready, "learned"), true);
  assert.equal(computeTopicStatus([report("ready_to_check"), report("learned")]).status, "learned");
  assert.equal(claudeMayChange(computeTopicStatus([owner("in_progress")]), "ready_to_check"), false);
  assert.deepEqual(TOPIC_STATUSES, ["not_started", "in_progress", "ready_to_check", "learned", "skipped"]);
});
