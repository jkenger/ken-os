import assert from "node:assert/strict";
import { test } from "node:test";
import { JobsInputError } from "./api";
import { parsePreferences } from "./preferences-store";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    skipWords: ["Sales", "Marketing"],
    skipCompanies: ["Acme"],
    postedWithinDays: 7,
    minimumPay: 80000,
    payCurrency: "usd",
    payPeriod: "year",
    jobTypes: ["full_time"],
    workSetups: ["remote"],
    countries: ["us", "au"],
    agenciesHide: true,
    ...overrides,
  };
}

test("valid input parses to preferences", () => {
  assert.deepEqual(parsePreferences(validInput()), {
    skipWords: ["Sales", "Marketing"],
    skipCompanies: ["Acme"],
    postedWithinDays: 7,
    minimumPay: 80000,
    payCurrency: "USD",
    payPeriod: "year",
    jobTypes: ["full_time"],
    workSetups: ["remote"],
    countries: ["US", "AU"],
    agenciesHide: true,
  });
});

test("a null minimumPay means no floor set", () => {
  const result = parsePreferences(validInput({ minimumPay: null }));
  assert.equal(result.minimumPay, null);
});

test("blank skip words and companies are dropped", () => {
  const result = parsePreferences(validInput({ skipWords: ["Sales", "  ", ""], skipCompanies: [] }));
  assert.deepEqual(result.skipWords, ["Sales"]);
});

test("a non-array skipWords is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ skipWords: "Sales" })), JobsInputError);
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

test("a non-boolean agenciesHide is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ agenciesHide: "yes" })), JobsInputError);
});

test("countries are upper-cased for exact ISO-code matching later", () => {
  const result = parsePreferences(validInput({ countries: ["gb", "ph"] }));
  assert.deepEqual(result.countries, ["GB", "PH"]);
});
