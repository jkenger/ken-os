import assert from "node:assert/strict";
import { test } from "node:test";
import {
  chooseExercise,
  computeProgress,
  finalizeClaudeLesson,
  judgeExerciseCheck,
  pointsFor,
  topicPoints,
  type ExerciseVersion,
  type LessonContent,
  type TopicEvent,
  type TopicEventKind,
} from "@ken-os/domain";
import { findTopic } from "./curriculum";

// Exercise versions and Claude's content (docs/architecture/engineering-claude-connector.md, sections 2 and 4).

const repo: ExerciseVersion = {
  id: "retry-policy",
  version: 0,
  source: "repo",
  checked: "valid",
  checkProblem: null,
  lockedAt: null,
  createdAt: null,
};
const claude = (
  version: number,
  checked: ExerciseVersion["checked"],
  extra: Partial<ExerciseVersion> = {},
): ExerciseVersion => ({
  id: `v${version}`,
  version,
  source: "claude",
  checked,
  checkProblem: checked === "invalid" ? "The starter already passes every test" : null,
  lockedAt: null,
  createdAt: null,
  ...extra,
});

test("the newest valid version is the default, and unchecked or invalid ones never are", () => {
  assert.equal(chooseExercise([repo], null).current.id, "retry-policy", "the repo lab is version 0");
  assert.equal(chooseExercise([repo, claude(1, "valid")], null).current.id, "v1");
  const pending = chooseExercise([repo, claude(1, "valid"), claude(2, "unchecked")], null);
  assert.equal(pending.current.id, "v1");
  assert.equal(pending.unchecked?.id, "v2", "the page checks it");
  const broken = chooseExercise([repo, claude(1, "valid"), claude(2, "invalid")], null);
  assert.equal(broken.current.id, "v1", "the previous valid version stays in use");
  assert.equal(broken.invalid?.id, "v2");
});

test("the version the owner ran stays theirs, with a newer valid one offered", () => {
  const choice = chooseExercise(
    [repo, claude(1, "valid", { lockedAt: "2026-10-12T00:00:00Z" }), claude(2, "valid")],
    "v1",
  );
  assert.equal(choice.current.id, "v1", "tests can't change mid-attempt");
  assert.equal(choice.newer?.id, "v2");
  assert.equal(
    chooseExercise([repo, claude(1, "valid")], "retry-policy").newer?.id,
    "v1",
    "a repo attempt is offered Claude's version too",
  );
  assert.equal(chooseExercise([repo, claude(1, "valid"), claude(2, "invalid")], "v1").invalid?.id, "v2");
  assert.equal(
    chooseExercise([repo, claude(1, "invalid"), claude(2, "valid")], "retry-policy").invalid,
    null,
    "a later valid version clears an old failure",
  );
});

test("a version checks out only when the solution passes every test and the starter fails one", () => {
  const pass = { name: "retries", passed: true };
  const fail = { name: "retries", passed: false, error: "Expected 3, got 1" };
  assert.deepEqual(judgeExerciseCheck({ solution: { results: [pass] }, starter: { results: [fail] } }), {
    checked: "valid",
    problem: null,
  });
  assert.deepEqual(
    judgeExerciseCheck({ solution: { results: [pass] }, starter: { error: "start is not defined" } }),
    { checked: "valid", problem: null },
    "a starter that throws fails",
  );
  assert.match(
    judgeExerciseCheck({ solution: { results: [fail] }, starter: { results: [fail] } }).problem!,
    /solution fails "retries" \(Expected 3, got 1\)/,
  );
  assert.match(
    judgeExerciseCheck({ solution: { results: [pass] }, starter: { results: [pass] } }).problem!,
    /starter already passes/,
  );
  assert.match(judgeExerciseCheck({ solution: { results: [] }, starter: { results: [] } }).problem!, /No tests ran/);
  assert.match(
    judgeExerciseCheck({ solution: { error: "Stopped after 3000 ms" }, starter: { results: [fail] } }).problem!,
    /didn't run/,
  );
});

test("a Claude proof question must name points that are on the topic", () => {
  const topic = findTopic("rel.retry_backoff")!;
  const points = topicPoints(topic);
  assert.equal(points[0].id, "p1");
  assert.equal(points[0].text, topic.points[0]);
  assert.deepEqual(
    pointsFor(topic, ["p2", "p1", "p2"]),
    [topic.points[0], topic.points[1]],
    "in points.yaml order, once each",
  );
  assert.throws(() => pointsFor(topic, []), /at least one/);
  assert.throws(() => pointsFor(topic, ["p1", "p99"]), /Not a point on rel.retry_backoff: p99/);
});

const lesson: LessonContent = {
  heading: "Retry with backoff",
  body: "Wait longer between each retry.",
  mentalModel: "A queue that spaces itself out.",
  block: { kind: "formula", content: "delay = base * 2 ** attempt", note: "Doubles each time." },
  example: "A payment call that fails once.",
  deeper: null,
  prove: ["Backoff spaces retries", "Jitter spreads clients", "Only retry safe calls"],
  sources: [
    { title: "MDN Retry-After", url: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After" },
    { title: "Someone's blog", url: "https://example.com/retries" },
  ],
};

test("a Claude lesson keeps only trusted sources and reports the rest", () => {
  const snapshot = finalizeClaudeLesson(lesson, { topicId: "rel.retry_backoff", version: 2 });
  assert.deepEqual(
    snapshot.sources.map((source) => source.url),
    [lesson.sources[0].url],
  );
  assert.deepEqual(snapshot.rejected, ["Not on a trusted site: https://example.com/retries"]);
  assert.equal(snapshot.sourcePacketId, null);
  assert.equal(snapshot.model, "claude");
  assert.throws(
    () =>
      finalizeClaudeLesson({ ...lesson, sources: [lesson.sources[1]] }, { topicId: "rel.retry_backoff", version: 2 }),
    /at least one source on a trusted site/,
  );
  assert.throws(
    () => finalizeClaudeLesson({ ...lesson, prove: ["One"] }, { topicId: "rel.retry_backoff", version: 2 }),
    /exactly 3/,
  );
  assert.throws(
    () => finalizeClaudeLesson({ ...lesson, body: "x".repeat(20_001) }, { topicId: "rel.retry_backoff", version: 2 }),
    /under 20000 characters/,
  );
});

let clock = Date.UTC(2026, 9, 12);
const event = (kind: TopicEventKind, passed: boolean | null = null): TopicEvent => ({
  id: String((clock += 60_000)),
  topicId: "rel.retry_backoff",
  kind,
  passed,
  label: kind === "proof" ? "solid" : null,
  createdAt: new Date(clock),
});

test("switching versions closes Prove until the new version passes, and saved content moves nothing", () => {
  const passed = [event("exercise_run", true)];
  assert.equal(computeProgress("rel.retry_backoff", passed).exercisePassed, true);
  const switched = [...passed, event("exercise_switched")];
  assert.equal(computeProgress("rel.retry_backoff", switched).exercisePassed, false);
  assert.equal(
    computeProgress("rel.retry_backoff", [...switched, event("proof", true)]).state,
    "PRACTICING",
    "no proof on an unpassed version",
  );
  assert.equal(
    computeProgress("rel.retry_backoff", [...switched, event("exercise_run", true), event("proof", true)]).state,
    "PROVEN",
  );
  const saved = computeProgress("rel.retry_backoff", [
    event("lesson_saved"),
    event("exercise_saved"),
    event("proof_question_saved"),
  ]);
  assert.equal(saved.state, "NOT_STARTED");
  assert.equal(saved.lastActivityAt, null, "Claude saving content isn't the owner's activity");
});
