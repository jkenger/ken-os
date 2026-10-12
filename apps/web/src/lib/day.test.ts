import assert from "node:assert/strict";
import { test } from "node:test";
import { ownerDay, ownerDayStart } from "./day";

test("the owner's day turns over at Manila midnight, not UTC midnight", () => {
  // 15:59 UTC is 23:59 in Manila; 16:00 UTC is the next day there.
  assert.equal(ownerDay(new Date("2026-10-06T15:59:00Z"), "Asia/Manila"), "2026-10-06");
  assert.equal(ownerDay(new Date("2026-10-06T16:00:00Z"), "Asia/Manila"), "2026-10-07");
  assert.equal(ownerDay(new Date("2026-10-06T23:30:00Z"), "Asia/Manila"), "2026-10-07");
});

test("the day starts at local midnight", () => {
  assert.equal(
    ownerDayStart(new Date("2026-10-06T23:30:00Z"), "Asia/Manila").toISOString(),
    "2026-10-06T16:00:00.000Z",
  );
  assert.equal(
    ownerDayStart(new Date("2026-10-06T03:00:00Z"), "Asia/Manila").toISOString(),
    "2026-10-05T16:00:00.000Z",
  );
  assert.equal(ownerDayStart(new Date("2026-10-06T03:00:00Z"), "UTC").toISOString(), "2026-10-06T00:00:00.000Z");
  // A zone with daylight saving: New York on 2026-07-01 is UTC-4.
  assert.equal(
    ownerDayStart(new Date("2026-07-01T12:00:00Z"), "America/New_York").toISOString(),
    "2026-07-01T04:00:00.000Z",
  );
});
