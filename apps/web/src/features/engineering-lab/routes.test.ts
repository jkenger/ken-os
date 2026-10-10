import assert from "node:assert/strict";
import { test } from "node:test";
import { engineering, legacyLabPath, tabForPath } from "./routes";

test("every legacy lab page maps to its Engineering page and keeps the query", () => {
  assert.equal(legacyLabPath("/lab"), "/engineering");
  assert.equal(legacyLabPath("/lab/"), "/engineering");
  assert.equal(legacyLabPath("/lab/profile", "?pane=roles"), "/engineering/profile/direction?pane=roles");
  assert.equal(legacyLabPath("/lab/assessment", "run=r1&chapter=m1"), "/engineering/profile/assessment?run=r1&chapter=m1");
  assert.equal(legacyLabPath("/lab/practice"), "/engineering/practice");
  assert.equal(legacyLabPath("/lab/topics"), "/engineering/learn");
  assert.equal(legacyLabPath("/lab/topics/js.event_loop", "?step=learn"), "/engineering/learn/js.event_loop?step=learn");
});

test("API routes and unknown paths are not redirected", () => {
  assert.equal(legacyLabPath("/api/lab/attempts"), null);
  assert.equal(legacyLabPath("/lab/topics/a/b"), null);
  assert.equal(legacyLabPath("/labs"), null);
});

test("route builders keep stable topic ids and drop empty query values", () => {
  assert.equal(engineering.topic("db.transactions", "prove"), "/engineering/learn/db.transactions?step=prove");
  assert.equal(engineering.topic("db.transactions"), "/engineering/learn/db.transactions");
  assert.equal(engineering.assessment, "/engineering/profile/assessment");
  assert.equal(engineering.direction, "/engineering/profile/direction");
  assert.equal(engineering.results("r 1"), "/engineering/profile/assessment/r%201/results");
  assert.equal(engineering.evidence("r 1"), "/engineering/profile/evidence/r%201");
});

test("nested pages belong to their tab", () => {
  assert.equal(tabForPath("/engineering"), "overview");
  assert.equal(tabForPath("/engineering/profile/assessment"), "profile");
  assert.equal(tabForPath("/engineering/profile/evidence/a1"), "profile");
  assert.equal(tabForPath("/engineering/learn/js.event_loop"), "learn");
  assert.equal(tabForPath("/engineering/practice"), "practice");
});
