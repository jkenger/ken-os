import assert from "node:assert/strict";
import { test } from "node:test";
import { areaLevel, chapterStates, computeProgress, roleDistance, type AttemptRecord, type Label, type Mode } from "@ken-os/domain";
import { capabilityRows, nextRequirement } from "./capabilities";
import { careers, findTopic, runModes, topicMap } from "./curriculum";

// The Profile capability table must agree with the level rules it summarizes.

let counter = 0;
function answer(topicId: string, mode: Mode, label: Label, overrides: Partial<AttemptRecord> = {}): AttemptRecord {
  counter += 1;
  return {
    id: `c${counter}`, topicId, kind: "baseline", mode, label, gradedBy: mode === "predict" ? "code" : "assessor", voided: false, selfRating: 3,
    misconceptions: [], solutionSeen: false, assessmentId: `set-${topicId}`, createdAt: new Date(Date.UTC(2026, 9, 6, 0, counter)),
    ...overrides,
  };
}

function rowsFor(attempts: AttemptRecord[], roleId: string | null) {
  const progress = topicMap.topics.map((topic) => computeProgress(topic, attempts, false).progress);
  const states = chapterStates(topicMap, progress, []);
  return { rows: capabilityRows({ careers, map: topicMap, progress, states, roleId }), states, progress };
}

const placeAll = (chapter: string) => topicMap.topics.filter((topic) => topic.chapter === chapter)
  .flatMap((topic) => runModes(findTopic(topic.id)!).map((mode) => answer(topic.id, mode, "solid")));

test("with no evidence every area is below junior, never shown as junior", () => {
  const { rows } = rowsFor([], null);
  assert.equal(rows.length, careers.areas.length);
  for (const row of rows) {
    assert.equal(row.current, null);
    assert.equal(row.scope, "junior", "without a direction the table shows what the next level needs");
    assert.ok(row.requirements.every((item) => !item.met));
    assert.equal(row.remaining, row.requirements.length);
  }
});

test("the table's current level matches areaLevel for the same states", () => {
  const { rows, states } = rowsFor([...placeAll("js-runtime"), ...placeAll("http-browser")], null);
  for (const row of rows) assert.equal(row.current, areaLevel(careers.areas.find((area) => area.id === row.area)!, states).level);
});

test("a direction scopes requirements to its targets and counts the same gaps as roleDistance", () => {
  const role = careers.roles.find((item) => item.id === "fullstack-applied-ai")!;
  const { rows, states } = rowsFor(placeAll("js-runtime"), role.id);
  const distance = roleDistance(role, careers, states);
  const unmet = rows.filter((row) => row.target).reduce((sum, row) => sum + row.remaining, 0);
  assert.equal(unmet, distance.missing.length);
  for (const row of rows) assert.equal(row.target, role.targets[row.area] ?? null);
});

test("placement and proof keep separate provenance", () => {
  const chapters = ["js-runtime", "databases"];
  const { rows } = rowsFor(chapters.flatMap(placeAll), null);
  const topics = rows.flatMap((row) => row.requirements).flatMap((item) => item.topics).filter((item) => chapters.includes(findTopic(item.topicId)!.chapter));
  assert.ok(topics.length > 0);
  for (const item of topics) {
    const topic = findTopic(item.topicId)!;
    // Baseline answers prove only when they cover every required mode with a code check; a lab-only mode can't be covered.
    const covered = topic.prove.every((mode) => runModes(topic).includes(mode));
    assert.equal(item.origin, covered ? "proof" : "placement", item.topicId);
    assert.equal(item.origin === "proof", item.status === "VALIDATED");
  }
  assert.ok(topics.some((item) => item.origin === "placement"), "some topics need a lab, so baseline answers can only place them");
});

test("the imported 1 Oct summary never satisfies a requirement", () => {
  const legacy = topicMap.topics.filter((topic) => topic.chapter === "js-runtime").map((topic) => answer(topic.id, "explain", "solid", { gradedBy: "baseline" }));
  const { rows } = rowsFor(legacy, null);
  const foundations = rows.flatMap((row) => row.requirements).filter((item) => item.chapterId === "js-runtime");
  assert.ok(foundations.length > 0);
  assert.ok(foundations.every((item) => item.topics.every((topic) => topic.origin === null)));
});

test("the next milestone is the lowest unmet requirement and names a topic it still needs", () => {
  const { rows } = rowsFor([], null);
  const next = nextRequirement(rows, null);
  assert.ok(next);
  assert.equal(next.requirement.level, "junior");
  assert.ok(next.topicId === null || next.requirement.missing.includes(next.topicId));
});

test("reordering areas or progress doesn't change the projection", () => {
  const attempts = placeAll("js-runtime");
  const progress = topicMap.topics.map((topic) => computeProgress(topic, attempts, false).progress);
  const states = chapterStates(topicMap, progress, []);
  const a = capabilityRows({ careers, map: topicMap, progress, states, roleId: null });
  const b = capabilityRows({ careers, map: topicMap, progress: [...progress].reverse(), states: [...states].reverse(), roleId: null });
  assert.deepEqual(a, b);
});
