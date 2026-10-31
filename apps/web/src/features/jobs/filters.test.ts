import assert from "node:assert/strict";
import { test } from "node:test";
import { filterReason } from "./filters";

const now = new Date("2026-10-30T12:00:00Z");
const base = { title: "Senior Frontend Engineer", company: "Acme Inc", firstSeenAt: new Date("2026-10-29T12:00:00Z") };
const noFilters = { skipWords: [], skipCompanies: [], postedWithinDays: 14 };

test("a posting matching no filter passes, with no reason", () => {
  assert.equal(filterReason(base, noFilters, now), null);
});

test("a title containing a skip word is filtered, with the matching word named", () => {
  assert.equal(
    filterReason({ ...base, title: "Sales Engineer" }, { ...noFilters, skipWords: ["Sales"] }, now),
    "Skip word: Sales",
  );
});

test("skip word matching is case-insensitive", () => {
  assert.equal(
    filterReason({ ...base, title: "sales engineer" }, { ...noFilters, skipWords: ["Sales"] }, now),
    "Skip word: Sales",
  );
});

test("a skip word that doesn't appear in the title doesn't filter", () => {
  assert.equal(filterReason(base, { ...noFilters, skipWords: ["Sales"] }, now), null);
});

test("a company matching a skip company is filtered, with the company named", () => {
  assert.equal(filterReason(base, { ...noFilters, skipCompanies: ["Acme Inc"] }, now), "Skip company: Acme Inc");
});

test("skip company matching is case-insensitive and exact, not a substring", () => {
  assert.equal(filterReason(base, { ...noFilters, skipCompanies: ["acme inc"] }, now), "Skip company: acme inc");
  assert.equal(filterReason(base, { ...noFilters, skipCompanies: ["Acme"] }, now), null);
});

test("a posting older than the posted-within window is filtered", () => {
  const old = { ...base, firstSeenAt: new Date("2026-10-01T12:00:00Z") };
  assert.equal(filterReason(old, { ...noFilters, postedWithinDays: 14 }, now), "Posted over 14 days ago");
});

test("a posting exactly at the posted-within boundary passes", () => {
  const atBoundary = { ...base, firstSeenAt: new Date("2026-10-16T12:00:00Z") };
  assert.equal(filterReason(atBoundary, { ...noFilters, postedWithinDays: 14 }, now), null);
});

test("skip words are checked before the posted-within window", () => {
  const old = { ...base, title: "Sales Engineer", firstSeenAt: new Date("2026-10-01T12:00:00Z") };
  assert.equal(
    filterReason(old, { skipWords: ["Sales"], skipCompanies: [], postedWithinDays: 14 }, now),
    "Skip word: Sales",
  );
});
