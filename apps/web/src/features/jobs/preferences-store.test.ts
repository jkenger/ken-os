import assert from "node:assert/strict";
import { test } from "node:test";
import { JobsInputError } from "./api";
import { parsePreferences } from "./preferences-store";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    roles: ["Senior Frontend Engineer"],
    skipWords: ["Sales", "Marketing"],
    skipCompanies: ["Acme"],
    countries: ["PH"],
    postedWithinDays: 7,
    minimumPay: 80000,
    maximumPay: 200000,
    payCurrency: "usd",
    payPeriod: "year",
    jobTypes: ["full_time"],
    workSetups: ["remote"],
    seniority: ["mid", "senior"],
    shifts: ["day", "night"],
    agenciesHide: true,
    ...overrides,
  };
}

test("valid input parses to preferences", () => {
  assert.deepEqual(parsePreferences(validInput()), {
    roles: ["Senior Frontend Engineer"],
    skipWords: ["Sales", "Marketing"],
    skipCompanies: ["Acme"],
    countries: ["PH"],
    postedWithinDays: 7,
    minimumPay: 80000,
    maximumPay: 200000,
    payCurrency: "USD",
    payPeriod: "year",
    jobTypes: ["full_time"],
    workSetups: ["remote"],
    seniority: ["mid", "senior"],
    shifts: ["day", "night"],
    agenciesHide: true,
  });
});

test("a null minimumPay means no floor set", () => {
  const result = parsePreferences(validInput({ minimumPay: null }));
  assert.equal(result.minimumPay, null);
});

test("a null maximumPay means no ceiling set", () => {
  const result = parsePreferences(validInput({ maximumPay: null }));
  assert.equal(result.maximumPay, null);
});

test("a negative maximumPay is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ maximumPay: -1 })), JobsInputError);
});

test("a maximumPay below minimumPay is rejected, naming the problem", () => {
  assert.throws(
    () => parsePreferences(validInput({ minimumPay: 80000, maximumPay: 50000 })),
    (error: unknown) => error instanceof JobsInputError && error.message.includes("Maximum pay"),
  );
});

test("a maximumPay equal to minimumPay is allowed (a one-value band)", () => {
  const result = parsePreferences(validInput({ minimumPay: 80000, maximumPay: 80000 }));
  assert.equal(result.minimumPay, 80000);
  assert.equal(result.maximumPay, 80000);
});

test("maximumPay with no minimumPay set is allowed", () => {
  const result = parsePreferences(validInput({ minimumPay: null, maximumPay: 200000 }));
  assert.equal(result.maximumPay, 200000);
});

test("blank skip words and companies are dropped", () => {
  const result = parsePreferences(validInput({ skipWords: ["Sales", "  ", ""], skipCompanies: [] }));
  assert.deepEqual(result.skipWords, ["Sales"]);
});

test("a non-array skipWords is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ skipWords: "Sales" })), JobsInputError);
});

test("blank countries are dropped, and an empty list means no country restriction", () => {
  const result = parsePreferences(validInput({ countries: ["PH", "  ", ""] }));
  assert.deepEqual(result.countries, ["PH"]);
  assert.deepEqual(parsePreferences(validInput({ countries: [] })).countries, []);
});

test("a non-array countries is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ countries: "PH" })), JobsInputError);
});

test("blank roles are dropped, and an empty list means fall back to the Profile", () => {
  const result = parsePreferences(validInput({ roles: ["Senior Frontend Engineer", "  ", ""] }));
  assert.deepEqual(result.roles, ["Senior Frontend Engineer"]);
  assert.deepEqual(parsePreferences(validInput({ roles: [] })).roles, []);
});

test("a non-array roles is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ roles: "Engineer" })), JobsInputError);
});

test("a negative postedWithinDays is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ postedWithinDays: -1 })), JobsInputError);
});

test("a non-integer postedWithinDays is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ postedWithinDays: 3.5 })), JobsInputError);
});

test("a negative minimumPay is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ minimumPay: -1 })), JobsInputError);
});

test("a blank payCurrency is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ payCurrency: "" })), JobsInputError);
});

test("an invalid payPeriod is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ payPeriod: "fortnight" })), JobsInputError);
});

test("an invalid job type is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ jobTypes: ["freelance"] })), JobsInputError);
});

test("an invalid work setup is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ workSetups: ["anywhere"] })), JobsInputError);
});

test("an invalid seniority is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ seniority: ["intern"] })), JobsInputError);
});

test("an invalid shift is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ shifts: ["afternoon"] })), JobsInputError);
});

test("an empty shifts list is allowed (no shift shown differently)", () => {
  const result = parsePreferences(validInput({ shifts: [] }));
  assert.deepEqual(result.shifts, []);
});

test("a non-boolean agenciesHide is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ agenciesHide: "yes" })), JobsInputError);
});
