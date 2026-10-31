import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultCurrencyFor } from "./country-currency";

test("a known country returns its default currency", () => {
  assert.equal(defaultCurrencyFor("US"), "USD");
  assert.equal(defaultCurrencyFor("PH"), "PHP");
  assert.equal(defaultCurrencyFor("GB"), "GBP");
});

test("lookup is case-insensitive", () => {
  assert.equal(defaultCurrencyFor("us"), "USD");
  assert.equal(defaultCurrencyFor("ph"), "PHP");
});

test("an unknown country returns null, not an error", () => {
  assert.equal(defaultCurrencyFor("ZZ"), null);
});

test("two countries that share a currency both resolve to it", () => {
  assert.equal(defaultCurrencyFor("DE"), "EUR");
  assert.equal(defaultCurrencyFor("FR"), "EUR");
});
