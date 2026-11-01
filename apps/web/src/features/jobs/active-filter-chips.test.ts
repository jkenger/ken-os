import assert from "node:assert/strict";
import { test } from "node:test";
import { activeFilterChips, clearFilterChip } from "./active-filter-chips";
import type { JobPreferences } from "./preferences-store";

const base: JobPreferences = {
  roles: [],
  skipWords: [],
  skipCompanies: [],
  postedWithinDays: 14,
  minimumPay: null,
  maximumPay: null,
  payCurrency: "USD",
  payPeriod: "month",
  jobTypes: ["full_time", "part_time", "contract", "internship", "temporary"],
  workSetups: ["remote", "hybrid", "on_site"],
  seniority: ["junior", "mid", "senior", "lead"],
  agenciesHide: false,
};

test("a fully open set of preferences still shows Posted within, since there's no unlimited option", () => {
  const chips = activeFilterChips(base);
  assert.deepEqual(
    chips.map((c) => c.key),
    ["postedWithin"],
  );
  assert.equal(chips[0]!.label, "14 days");
});

test("365 days or more reads as Anytime, not a literal day count", () => {
  const chips = activeFilterChips({ ...base, postedWithinDays: 365 });
  assert.equal(chips.find((c) => c.key === "postedWithin")!.label, "Anytime");
});

test("every restricted dimension produces its own chip, matching the reference's worked example", () => {
  const applied: JobPreferences = {
    ...base,
    minimumPay: 2500,
    payPeriod: "month",
    jobTypes: ["full_time", "contract"],
    workSetups: ["remote"],
    seniority: ["mid", "senior"],
    skipWords: ["Sales"],
    agenciesHide: true,
  };
  const chips = activeFilterChips(applied);
  assert.deepEqual(
    chips.map((c) => c.key),
    ["pay", "workSetups", "seniority", "jobTypes", "skipWord:Sales", "agencies", "postedWithin"],
  );
  assert.equal(chips.find((c) => c.key === "pay")!.label, "$2,500+ a month");
  assert.equal(
    activeFilterChips({ ...base, minimumPay: 2000, payCurrency: "PHP" }).find((c) => c.key === "pay")!.label,
    "₱2,000+ a month",
  );
  assert.equal(chips.find((c) => c.key === "seniority")!.label, "Mid, Senior");
  assert.equal(chips.find((c) => c.key === "agencies")!.label, "No agencies");
});

test("skip companies and skip words each get their own chip, one per entry", () => {
  const chips = activeFilterChips({ ...base, skipWords: ["Sales", "Marketing"], skipCompanies: ["Acme"] });
  assert.deepEqual(
    chips.map((c) => c.key),
    ["skipWord:Sales", "skipWord:Marketing", "skipCompany:Acme", "postedWithin"],
  );
});

test("dropping the pay chip clears both minimum and maximum", () => {
  const result = clearFilterChip({ ...base, minimumPay: 2500, maximumPay: 6000 }, "pay");
  assert.equal(result.minimumPay, null);
  assert.equal(result.maximumPay, null);
});

test("dropping the work setup chip opens it back up to every option", () => {
  const result = clearFilterChip({ ...base, workSetups: ["remote"] }, "workSetups");
  assert.deepEqual(result.workSetups.sort(), ["hybrid", "on_site", "remote"]);
});

test("dropping the seniority chip opens it back up to every level", () => {
  const result = clearFilterChip({ ...base, seniority: ["mid"] }, "seniority");
  assert.deepEqual(result.seniority.sort(), ["junior", "lead", "mid", "senior"]);
});

test("dropping one skip word removes only that word, not the others", () => {
  const result = clearFilterChip({ ...base, skipWords: ["Sales", "Marketing"] }, "skipWord:Sales");
  assert.deepEqual(result.skipWords, ["Marketing"]);
});

test("dropping the agencies chip shows agency postings again", () => {
  const result = clearFilterChip({ ...base, agenciesHide: true }, "agencies");
  assert.equal(result.agenciesHide, false);
});

test("dropping Posted within resets it to a year, the closest this schema has to unlimited", () => {
  const result = clearFilterChip({ ...base, postedWithinDays: 14 }, "postedWithin");
  assert.equal(result.postedWithinDays, 365);
});
