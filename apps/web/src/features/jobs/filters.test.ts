import assert from "node:assert/strict";
import { test } from "node:test";
import { filterReason } from "./filters";
import type { JobPreferences } from "./preferences-store";

const now = new Date("2026-10-30T12:00:00Z");
const base = { title: "Senior Frontend Engineer", company: "Acme Inc", firstSeenAt: new Date("2026-10-29T12:00:00Z") };
const noFilters: JobPreferences = {
  skipWords: [],
  skipCompanies: [],
  postedWithinDays: 14,
  payThresholds: [],
  jobTypes: ["full_time", "contract"],
  workSetups: ["remote"],
  countries: ["US", "AU", "GB"],
  agenciesHide: false,
};

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
  assert.equal(filterReason(old, { ...noFilters, skipWords: ["Sales"] }, now), "Skip word: Sales");
});

test("a posting below the threshold configured for its own currency is filtered", () => {
  const posting = { ...base, payAmount: 60000, payCurrency: "USD", payPeriod: "year" as const };
  const preferences = {
    ...noFilters,
    payThresholds: [{ currency: "USD", minimumPay: 80000, payPeriod: "year" as const }],
  };
  assert.equal(filterReason(posting, preferences, now), "Below minimum pay");
});

test("a posting at or above the threshold configured for its own currency is not filtered", () => {
  const posting = { ...base, payAmount: 80000, payCurrency: "USD", payPeriod: "year" as const };
  const preferences = {
    ...noFilters,
    payThresholds: [{ currency: "USD", minimumPay: 80000, payPeriod: "year" as const }],
  };
  assert.equal(filterReason(posting, preferences, now), null);
});

test("pay periods are normalized before comparing, within the same currency's threshold", () => {
  // 50/hr * 173.33 ~= 8667/mo, below a 9000/mo threshold
  const posting = { ...base, payAmount: 50, payCurrency: "USD", payPeriod: "hour" as const };
  const preferences = {
    ...noFilters,
    payThresholds: [{ currency: "USD", minimumPay: 9000, payPeriod: "month" as const }],
  };
  assert.equal(filterReason(posting, preferences, now), "Below minimum pay");
});

test("a posting with no pay listed is not filtered for pay", () => {
  const posting = { ...base, payAmount: null, payCurrency: null, payPeriod: null };
  const preferences = {
    ...noFilters,
    payThresholds: [{ currency: "USD", minimumPay: 80000, payPeriod: "year" as const }],
  };
  assert.equal(filterReason(posting, preferences, now), null);
});

test("a posting whose currency has no configured threshold at all is not filtered for pay", () => {
  const posting = { ...base, payAmount: 1000, payCurrency: "PHP", payPeriod: "month" as const };
  const preferences = {
    ...noFilters,
    payThresholds: [{ currency: "USD", minimumPay: 80000, payPeriod: "year" as const }],
  };
  assert.equal(filterReason(posting, preferences, now), null);
});

test("a second currency's threshold is checked independently of the first", () => {
  const preferences = {
    ...noFilters,
    payThresholds: [
      { currency: "USD", minimumPay: 80000, payPeriod: "year" as const },
      { currency: "PHP", minimumPay: 50000, payPeriod: "month" as const },
    ],
  };
  const belowPhp = { ...base, payAmount: 30000, payCurrency: "PHP", payPeriod: "month" as const };
  assert.equal(filterReason(belowPhp, preferences, now), "Below minimum pay");

  const aboveUsd = { ...base, payAmount: 90000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(aboveUsd, preferences, now), null);
});

test("a posting whose job type isn't in the owner's allowed set is filtered", () => {
  const posting = { ...base, jobType: "part_time" as const };
  assert.equal(filterReason(posting, { ...noFilters, jobTypes: ["full_time"] }, now), "Job type: part_time");
});

test("a posting with no job type stated is not filtered for job type", () => {
  const posting = { ...base, jobType: null };
  assert.equal(filterReason(posting, { ...noFilters, jobTypes: ["full_time"] }, now), null);
});

test("a posting whose work setup isn't in the owner's allowed set is filtered", () => {
  const posting = { ...base, workSetup: "on_site" as const };
  assert.equal(filterReason(posting, { ...noFilters, workSetups: ["remote"] }, now), "Work setup: on_site");
});

test("a posting with no work setup stated is not filtered for work setup", () => {
  const posting = { ...base, workSetup: null };
  assert.equal(filterReason(posting, { ...noFilters, workSetups: ["remote"] }, now), null);
});

test("a posting whose stated countries don't overlap the owner's allowed set is filtered", () => {
  const posting = { ...base, countries: ["DE"] };
  assert.equal(filterReason(posting, { ...noFilters, countries: ["US", "AU", "GB"] }, now), "Country: DE");
});

test("a posting with an empty countries list (none stated) is not filtered for country", () => {
  const posting = { ...base, countries: [] };
  assert.equal(filterReason(posting, { ...noFilters, countries: ["US"] }, now), null);
});

test("a posting whose countries overlap the owner's allowed set at all is not filtered", () => {
  const posting = { ...base, countries: ["DE", "US"] };
  assert.equal(filterReason(posting, { ...noFilters, countries: ["US", "AU", "GB"] }, now), null);
});

test("an agency posting is filtered only when Agencies is set to Hide", () => {
  const posting = { ...base, isAgency: true };
  assert.equal(filterReason(posting, { ...noFilters, agenciesHide: false }, now), null);
  assert.equal(filterReason(posting, { ...noFilters, agenciesHide: true }, now), "Recruiting agency");
});

test("a non-agency posting is never filtered for Agencies, even when set to Hide", () => {
  const posting = { ...base, isAgency: false };
  assert.equal(filterReason(posting, { ...noFilters, agenciesHide: true }, now), null);
});

test("a not-yet-processed posting (no extracted fields at all) only gets the list-field checks", () => {
  const preferences = {
    ...noFilters,
    payThresholds: [{ currency: "USD", minimumPay: 80000, payPeriod: "year" as const }],
    countries: ["US"],
  };
  assert.equal(filterReason(base, preferences, now), null);
});
