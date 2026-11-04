import assert from "node:assert/strict";
import { test } from "node:test";
import { timeAgo } from "./time-ago";

const now = new Date("2026-11-10T12:00:00Z");

test("under a minute reads as just now", () => {
  assert.equal(timeAgo(new Date("2026-11-10T11:59:50Z"), now), "just now");
});

test("minutes, hours and days under a week read as a relative count", () => {
  assert.equal(timeAgo(new Date("2026-11-10T11:10:00Z"), now), "50m ago");
  assert.equal(timeAgo(new Date("2026-11-10T02:00:00Z"), now), "10h ago");
  assert.equal(timeAgo(new Date("2026-11-08T12:00:00Z"), now), "2d ago");
});

test("a week or more old switches to a calendar date, same year", () => {
  assert.equal(timeAgo(new Date("2026-10-23T12:00:00Z"), now), "Oct 23");
});

test("a date from a different year includes the year", () => {
  assert.equal(timeAgo(new Date("2025-10-23T12:00:00Z"), now), "Oct 23, 2025");
});
