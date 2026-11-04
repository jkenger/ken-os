import assert from "node:assert/strict";
import { test } from "node:test";
import { isNew } from "./new-list";

const DAY_MS = 24 * 60 * 60 * 1000;

test("a never-opened posting less than 3 days old is New", () => {
  assert.equal(isNew({ viewedAt: null, firstSeenAt: new Date(Date.now() - 2 * DAY_MS) }), true);
});

test("a never-opened posting older than 3 days stops being New", () => {
  assert.equal(isNew({ viewedAt: null, firstSeenAt: new Date(Date.now() - 4 * DAY_MS) }), false);
});

test("an opened posting is never New, no matter how recent", () => {
  assert.equal(isNew({ viewedAt: new Date(), firstSeenAt: new Date() }), false);
});
