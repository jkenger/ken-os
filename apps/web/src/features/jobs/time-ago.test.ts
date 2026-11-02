import assert from "node:assert/strict";
import { test } from "node:test";
import { timeAgo } from "./time-ago";

const now = new Date("2026-10-30T12:00:00Z");

test("under a minute reads as just now", () => {
  assert.equal(timeAgo(new Date("2026-10-30T11:59:30Z"), now), "just now");
});

test("minutes read as m ago", () => {
  assert.equal(timeAgo(new Date("2026-10-30T11:45:00Z"), now), "15m ago");
});

test("hours read as h ago", () => {
  assert.equal(timeAgo(new Date("2026-10-30T09:00:00Z"), now), "3h ago");
});

test("days read as d ago", () => {
  assert.equal(timeAgo(new Date("2026-10-27T12:00:00Z"), now), "3d ago");
});
