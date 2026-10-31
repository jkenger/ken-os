import assert from "node:assert/strict";
import { test } from "node:test";
import { autofillThresholds, suggestedCurrencies } from "./pay-threshold-suggestions";

test("a country whose default currency has no configured threshold yet is suggested", () => {
  assert.deepEqual(suggestedCurrencies(["US"], []), ["USD"]);
});

test("a country whose default currency already has a configured threshold is never suggested", () => {
  const existing = [{ currency: "USD", minimumPay: 80000, payPeriod: "year" as const }];
  assert.deepEqual(suggestedCurrencies(["US"], existing), []);
});

test("two countries that share a currency only suggest it once", () => {
  assert.deepEqual(suggestedCurrencies(["DE", "FR"], []), ["EUR"]);
});

test("a country with no entry in the country-currency table suggests nothing for it, not an error", () => {
  assert.deepEqual(suggestedCurrencies(["ZZ"], []), []);
  assert.deepEqual(suggestedCurrencies(["US", "ZZ"], []), ["USD"]);
});

test("suggestions are matched case-insensitively against existing thresholds", () => {
  const existing = [{ currency: "usd", minimumPay: 80000, payPeriod: "year" as const }];
  assert.deepEqual(suggestedCurrencies(["US"], existing), []);
});

test("autofillThresholds converts the anchor's amount into each other given currency, keeping its period", () => {
  const anchor = { currency: "USD", minimumPay: 100, payPeriod: "month" as const };
  const result = autofillThresholds(anchor, ["PHP"]);
  assert.deepEqual(result, [{ currency: "PHP", minimumPay: 5650, payPeriod: "month" }]);
});

test("autofillThresholds never includes the anchor's own currency in its output", () => {
  const anchor = { currency: "USD", minimumPay: 100, payPeriod: "year" as const };
  const result = autofillThresholds(anchor, ["USD", "PHP"]);
  assert.deepEqual(
    result.map((entry) => entry.currency),
    ["PHP"],
  );
});

test("autofillThresholds fills every given currency, in order", () => {
  const anchor = { currency: "USD", minimumPay: 100, payPeriod: "year" as const };
  const result = autofillThresholds(anchor, ["PHP", "GBP"]);
  assert.deepEqual(
    result.map((entry) => entry.currency),
    ["PHP", "GBP"],
  );
});
