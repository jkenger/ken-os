import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULTS } from "./preferences-defaults";
import { preferencesSummary } from "./preferences-summary";

test("a brand-new owner's untouched preferences read as Defaults", () => {
  const summary = preferencesSummary(DEFAULTS);
  assert.equal(summary.stateWord, "Defaults");
  assert.equal(summary.line, "Remote · Full time, Contract · Posted within 14 days");
  assert.equal(summary.caption, "Minimum pay not set, so every pay passes");
});

test("any edit away from the defaults reads as Custom", () => {
  const summary = preferencesSummary({ ...DEFAULTS, postedWithinDays: 7 });
  assert.equal(summary.stateWord, "Custom");
});

test("a restricted seniority shows up in the line, same wording as the active filter chips", () => {
  const summary = preferencesSummary({ ...DEFAULTS, seniority: ["mid", "senior"] });
  assert.equal(summary.line, "Remote · Full time, Contract · Mid, Senior · Posted within 14 days");
});

test("once a minimum or maximum pay is set, the caption about unset pay goes away", () => {
  const summary = preferencesSummary({ ...DEFAULTS, minimumPay: 2500 });
  assert.equal(summary.caption, undefined);
});

test("every option checked in every dimension collapses to just the posted-within segment", () => {
  const summary = preferencesSummary({
    ...DEFAULTS,
    jobTypes: ["full_time", "part_time", "contract", "internship", "temporary"],
    workSetups: ["remote", "hybrid", "on_site"],
  });
  assert.equal(summary.line, "Posted within 14 days");
});

test("anytime reads as Anytime, not a day count", () => {
  const summary = preferencesSummary({ ...DEFAULTS, postedWithinDays: 365 });
  assert.equal(summary.line, "Remote · Full time, Contract · Anytime");
});
