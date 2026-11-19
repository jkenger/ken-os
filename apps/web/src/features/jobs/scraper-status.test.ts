import assert from "node:assert/strict";
import { test } from "node:test";
import { describeScraperState } from "./scraper-status";

const NOW = new Date("2026-11-19T12:00:00Z");

test("a source with no row at all is never, not a crash", () => {
  assert.deepEqual(describeScraperState(undefined, NOW), { kind: "never" });
});

test("a source that's run and isn't blocked is running, with how long ago it last ran", () => {
  const view = describeScraperState(
    { source: "linkedin", blocked: false, blockedUntil: null, lastRunAt: new Date("2026-11-19T11:55:00Z") },
    NOW,
  );
  assert.deepEqual(view, { kind: "running", agoLabel: "5m ago" });
});

test("a source that's run but never gotten a lastRunAt stamp is still running, with no ago label", () => {
  const view = describeScraperState({ source: "linkedin", blocked: false, blockedUntil: null, lastRunAt: null }, NOW);
  assert.deepEqual(view, { kind: "running", agoLabel: null });
});

test("a source blocked until a future time is blocked, with that time labeled", () => {
  const until = new Date("2026-11-20T15:14:00Z");
  const view = describeScraperState({ source: "linkedin", blocked: true, blockedUntil: until, lastRunAt: null }, NOW);
  assert.equal(view.kind, "blocked");
  assert.equal((view as { untilLabel: string }).untilLabel, until.toLocaleString());
});

test("a source blocked until a time already in the past is running, not stuck blocked forever", () => {
  const until = new Date("2026-11-19T06:00:00Z");
  const view = describeScraperState({ source: "linkedin", blocked: true, blockedUntil: until, lastRunAt: null }, NOW);
  assert.equal(view.kind, "running");
});

test("a row marked blocked with no blockedUntil at all is treated as running, never stuck with no way out", () => {
  const view = describeScraperState({ source: "linkedin", blocked: true, blockedUntil: null, lastRunAt: null }, NOW);
  assert.equal(view.kind, "running");
});
