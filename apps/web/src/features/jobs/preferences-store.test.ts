import assert from "node:assert/strict";
import { test } from "node:test";
import { JobsInputError } from "./api";
import { parsePreferences } from "./preferences-store";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    skipWords: ["Sales", "Marketing"],
    skipCompanies: ["Acme"],
    postedWithinDays: 7,
    payThresholds: [{ currency: "usd", minimumPay: 80000, payPeriod: "year" }],
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
    payThresholds: [{ currency: "USD", minimumPay: 80000, payPeriod: "year" }],
    jobTypes: ["full_time"],
    workSetups: ["remote"],
    countries: ["US", "AU"],
    agenciesHide: true,
  });
});

test("an empty payThresholds list means no floor is set for any currency", () => {
  const result = parsePreferences(validInput({ payThresholds: [] }));
  assert.deepEqual(result.payThresholds, []);
});

test("a non-array payThresholds is rejected", () => {
  assert.throws(() => parsePreferences(validInput({ payThresholds: "nope" })), JobsInputError);
});

test("a payThresholds entry missing a currency is rejected", () => {
  assert.throws(
    () => parsePreferences(validInput({ payThresholds: [{ currency: "", minimumPay: 1000, payPeriod: "month" }] })),
    JobsInputError,
  );
});

test("a payThresholds entry with a negative minimumPay is rejected", () => {
  assert.throws(
    () => parsePreferences(validInput({ payThresholds: [{ currency: "USD", minimumPay: -1, payPeriod: "month" }] })),
    JobsInputError,
  );
});

test("a payThresholds entry with an invalid payPeriod is rejected", () => {
  assert.throws(
    () =>
      parsePreferences(validInput({ payThresholds: [{ currency: "USD", minimumPay: 1000, payPeriod: "fortnight" }] })),
    JobsInputError,
  );
});

test("payThresholds currencies are upper-cased, same as Countries", () => {
  const result = parsePreferences(
    validInput({ payThresholds: [{ currency: "php", minimumPay: 50000, payPeriod: "month" }] }),
  );
  assert.deepEqual(result.payThresholds, [{ currency: "PHP", minimumPay: 50000, payPeriod: "month" }]);
});

test("two payThresholds entries in different currencies both parse", () => {
  const result = parsePreferences(
    validInput({
      payThresholds: [
        { currency: "USD", minimumPay: 80000, payPeriod: "year" },
        { currency: "PHP", minimumPay: 50000, payPeriod: "month" },
      ],
    }),
  );
  assert.deepEqual(result.payThresholds, [
    { currency: "USD", minimumPay: 80000, payPeriod: "year" },
    { currency: "PHP", minimumPay: 50000, payPeriod: "month" },
  ]);
});

test("the same currency configured twice is rejected, since it's ambiguous which one would apply", () => {
  assert.throws(
    () =>
      parsePreferences(
        validInput({
          payThresholds: [
            { currency: "USD", minimumPay: 80000, payPeriod: "year" },
            { currency: "usd", minimumPay: 90000, payPeriod: "year" },
          ],
        }),
      ),
    JobsInputError,
  );
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
