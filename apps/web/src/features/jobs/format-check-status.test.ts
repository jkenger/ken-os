import assert from "node:assert/strict";
import { test } from "node:test";
import { describeCheckStatus } from "./format-check-status";

function status(overrides: Partial<Parameters<typeof describeCheckStatus>[0] & object> = {}) {
  return {
    firstCheckedAt: new Date("2026-10-31T09:00:00Z"),
    checkedAt: new Date("2026-11-03T11:55:00Z"),
    checkCount: 1412,
    ok: true,
    reason: "ok",
    found: 0,
    lastOkAt: new Date("2026-11-03T11:55:00Z"),
    ...overrides,
  };
}

const NOW = new Date("2026-11-03T12:00:00Z");

test("a user who's never been checked is the never kind, not a crash", () => {
  assert.deepEqual(describeCheckStatus(null, NOW), { kind: "never" });
});

test("a recent successful check is working, and carries the count and since-date", () => {
  const view = describeCheckStatus(status({ found: 3, checkCount: 1412 }), NOW);
  assert.deepEqual(view, {
    kind: "working",
    agoLabel: "5m ago",
    found: 3,
    checkCount: 1412,
    sinceLabel: "Oct 31",
  });
});

test("a failed check is failing, naming the reason and the last time it worked", () => {
  const view = describeCheckStatus(
    status({ ok: false, reason: "bad secret", checkedAt: new Date("2026-11-03T11:20:00Z") }),
    NOW,
  );
  assert.deepEqual(view, {
    kind: "failing",
    agoLabel: "40m ago",
    reason: "bad secret",
    lastGoodAgoLabel: "5m ago",
  });
});

test("a check that has never once succeeded is failing with no last-good time", () => {
  const view = describeCheckStatus(status({ ok: false, reason: "bad secret", lastOkAt: null }), NOW);
  assert.equal(view.kind, "failing");
  assert.equal((view as { lastGoodAgoLabel: string | null }).lastGoodAgoLabel, null);
});

test("a successful check too old to trust is late, not working -- the scheduler may have stopped", () => {
  const view = describeCheckStatus(status({ checkedAt: new Date("2026-11-03T06:00:00Z") }), NOW);
  assert.deepEqual(view, { kind: "late", agoLabel: "6h ago" });
});

test("a failed check stays failing even once it's old too -- staleness never overrides a known failure", () => {
  const view = describeCheckStatus(
    status({ ok: false, reason: "bad secret", checkedAt: new Date("2026-11-03T06:00:00Z") }),
    NOW,
  );
  assert.equal(view.kind, "failing");
});

test("just inside the staleness window still counts as working", () => {
  const view = describeCheckStatus(status({ checkedAt: new Date("2026-11-03T11:56:00Z") }), NOW);
  assert.equal(view.kind, "working");
});
