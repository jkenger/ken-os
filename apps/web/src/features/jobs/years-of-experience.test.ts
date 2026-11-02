import assert from "node:assert/strict";
import { test } from "node:test";
import { yearsOfExperience } from "./years-of-experience";

const now = new Date("2026-11-01T00:00:00Z");

test("one role spans exactly its own start to end", () => {
  const years = yearsOfExperience([{ start: "2020-01", end: "2023-01" }], now);
  assert.equal(years, 3);
}); // 3 years exactly

test("an empty end means still ongoing, counted through now", () => {
  const years = yearsOfExperience([{ start: "2024-11", end: "" }], now);
  assert.equal(years, 2); // 2024-11 to 2026-11 is 2 years exactly
});

test("overlapping roles are not double counted -- the span is earliest start to latest end", () => {
  const years = yearsOfExperience(
    [
      { start: "2020-01", end: "2022-01" },
      { start: "2021-01", end: "2023-01" },
    ],
    now,
  );
  assert.equal(years, 3); // 2020-01 to 2023-01, not 2+2=4
});

test("a year-only date (no month) is treated as January", () => {
  const years = yearsOfExperience([{ start: "2020", end: "2022" }], now);
  assert.equal(years, 2);
});

test("no experience at all is 0 years, never thrown", () => {
  assert.equal(yearsOfExperience([], now), 0);
});

test("a blank start is skipped, not treated as year zero", () => {
  const years = yearsOfExperience([{ start: "", end: "2022-01" }], now);
  assert.equal(years, 0);
});

test("a role with a blank start doesn't stretch the span via its own end", () => {
  const years = yearsOfExperience(
    [
      { start: "2022-01", end: "2023-01" },
      { start: "", end: "2026-01" },
    ],
    now,
  );
  assert.equal(years, 1); // the blank-start role is ignored entirely, not just its start
});

test("the result rounds down to a whole number of years", () => {
  const years = yearsOfExperience([{ start: "2020-01", end: "2023-07" }], now);
  assert.equal(years, 3);
});
