import assert from "node:assert/strict";
import { test } from "node:test";
import { filterReason } from "./filters";
import type { JobPreferences } from "./preferences-store";

const now = new Date("2026-10-30T12:00:00Z");
const base = { title: "Senior Frontend Engineer", company: "Acme Inc", firstSeenAt: new Date("2026-10-29T12:00:00Z") };
const noFilters: JobPreferences = {
  roles: [],
  skipWords: [],
  skipCompanies: [],
  postedWithinDays: 14,
  minimumPay: null,
  maximumPay: null,
  payCurrency: "USD",
  payPeriod: "month",
  jobTypes: ["full_time", "contract"],
  workSetups: ["remote"],
  agenciesHide: false,
};
const rates = { USD: 1, PHP: 56.5, GBP: 0.79 };

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

test("a posting below Minimum pay, same currency and period, is filtered", () => {
  const posting = { ...base, payAmount: 60000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(posting, { ...noFilters, minimumPay: 80000, payPeriod: "year" }, now), "Below minimum pay");
});

test("a posting at or above Minimum pay is not filtered", () => {
  const posting = { ...base, payAmount: 80000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(posting, { ...noFilters, minimumPay: 80000, payPeriod: "year" }, now), null);
});

test("pay periods are normalized before comparing (hourly vs the owner's monthly minimum)", () => {
  // 50/hr * 173.33 ~= 8667/mo, below a 9000/mo minimum
  const posting = { ...base, payAmount: 50, payCurrency: "USD", payPeriod: "hour" as const };
  assert.equal(filterReason(posting, { ...noFilters, minimumPay: 9000, payPeriod: "month" }, now), "Below minimum pay");
});

test("a posting with no pay listed is not filtered for pay", () => {
  const posting = { ...base, payAmount: null, payCurrency: null, payPeriod: null };
  assert.equal(filterReason(posting, { ...noFilters, minimumPay: 80000 }, now), null);
});

test("a posting in a different currency is converted via the cached rates before comparing", () => {
  // 1000 PHP/month -> USD via the 56.5 rate ~= 17.70/month, well below an 80000/month minimum
  const posting = { ...base, payAmount: 1000, payCurrency: "PHP", payPeriod: "month" as const };
  const preferences = { ...noFilters, minimumPay: 80000, payCurrency: "USD", payPeriod: "month" as const };
  assert.equal(filterReason(posting, preferences, now, { currencyRates: rates }), "Below minimum pay");
});

test("a posting in a different currency, converted, that clears the minimum is not filtered", () => {
  // 10,000,000 PHP/year -> USD via the 56.5 rate ~= 176,991/year, above a 100,000/year minimum
  const posting = { ...base, payAmount: 10_000_000, payCurrency: "PHP", payPeriod: "year" as const };
  const preferences = { ...noFilters, minimumPay: 100_000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(posting, preferences, now, { currencyRates: rates }), null);
});

test("a posting whose currency has no cached rate is not filtered for pay, not guessed at", () => {
  const posting = { ...base, payAmount: 1000, payCurrency: "ZZZ", payPeriod: "month" as const };
  const preferences = { ...noFilters, minimumPay: 80000, payCurrency: "USD" };
  assert.equal(filterReason(posting, preferences, now, { currencyRates: rates }), null);
});

test("with no currency rates supplied at all, a cross-currency posting is not filtered for pay", () => {
  const posting = { ...base, payAmount: 1000, payCurrency: "PHP", payPeriod: "month" as const };
  const preferences = { ...noFilters, minimumPay: 80000, payCurrency: "USD" };
  assert.equal(filterReason(posting, preferences, now), null);
});

test("a posting above Maximum pay, same currency and period, is filtered", () => {
  const posting = { ...base, payAmount: 250000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(
    filterReason(posting, { ...noFilters, maximumPay: 200000, payPeriod: "year" }, now),
    "Above maximum pay",
  );
});

test("a posting within the minimum/maximum band is not filtered", () => {
  const posting = { ...base, payAmount: 150000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(
    filterReason(posting, { ...noFilters, minimumPay: 80000, maximumPay: 200000, payPeriod: "year" }, now),
    null,
  );
});

test("a posting exactly at Maximum pay is not filtered (inclusive boundary)", () => {
  const posting = { ...base, payAmount: 200000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(posting, { ...noFilters, maximumPay: 200000, payPeriod: "year" }, now), null);
});

test("with no Maximum pay configured, a posting is never filtered for being too high", () => {
  const posting = { ...base, payAmount: 10_000_000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(posting, { ...noFilters, maximumPay: null }, now), null);
});

test("a posting with no pay listed is not filtered for Maximum pay", () => {
  const posting = { ...base, payAmount: null, payCurrency: null, payPeriod: null };
  assert.equal(filterReason(posting, { ...noFilters, maximumPay: 80000 }, now), null);
});

test("a posting in a different currency is converted via the cached rates before comparing to Maximum pay", () => {
  // 10,000,000 PHP/year -> USD via the 56.5 rate ~= 176,991/year, above a 100,000/year maximum
  const posting = { ...base, payAmount: 10_000_000, payCurrency: "PHP", payPeriod: "year" as const };
  const preferences = { ...noFilters, maximumPay: 100_000, payCurrency: "USD", payPeriod: "year" as const };
  assert.equal(filterReason(posting, preferences, now, { currencyRates: rates }), "Above maximum pay");
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

test("a posting whose stated countries don't include the target country is filtered", () => {
  const posting = { ...base, eligibilityStated: true, countries: ["DE"] };
  assert.equal(filterReason(posting, noFilters, now, { targetCountry: "PH" }), "Country: DE");
});

test("a processed posting that states no eligibility at all is shown, not filtered -- most postings never say, and hiding them hid genuinely-reachable roles too", () => {
  const posting = { ...base, eligibilityStated: false, countries: [] };
  assert.equal(filterReason(posting, noFilters, now, { targetCountry: "PH" }), null);
});

test("a processed posting that explicitly says it's open to everyone (stated, empty list) is not filtered", () => {
  const posting = { ...base, eligibilityStated: true, countries: [] };
  assert.equal(filterReason(posting, noFilters, now, { targetCountry: "PH" }), null);
});

test("a posting whose eligibilityStated field is undefined (not yet processed) is not filtered for country", () => {
  assert.equal(filterReason(base, noFilters, now, { targetCountry: "PH" }), null);
});

test("a posting whose eligibilityStated field is null (not yet processed, as a nullable DB column reads it) is not filtered for country", () => {
  const posting = { ...base, eligibilityStated: null };
  assert.equal(filterReason(posting, noFilters, now, { targetCountry: "PH" }), null);
});

test("a posting whose stated countries include the target country is not filtered", () => {
  const posting = { ...base, eligibilityStated: true, countries: ["DE", "PH"] };
  assert.equal(filterReason(posting, noFilters, now, { targetCountry: "PH" }), null);
});

test("the target country matching is case-insensitive", () => {
  const posting = { ...base, eligibilityStated: true, countries: ["ph"] };
  assert.equal(filterReason(posting, noFilters, now, { targetCountry: "PH" }), null);
});

test("the target country defaults to PH when none is given", () => {
  const posting = { ...base, eligibilityStated: true, countries: ["PH"] };
  assert.equal(filterReason(posting, noFilters, now), null);
  const excluded = { ...base, eligibilityStated: true, countries: ["DE"] };
  assert.equal(filterReason(excluded, noFilters, now), "Country: DE");
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
  assert.equal(filterReason(base, { ...noFilters, minimumPay: 80000 }, now, { targetCountry: "US" }), null);
});
