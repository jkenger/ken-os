import assert from "node:assert/strict";
import { test } from "node:test";
import { convertAmount } from "./currency-rates";

test("converting an amount to the same currency returns it unchanged", () => {
  assert.equal(convertAmount(80000, "USD", "USD"), 80000);
});

test("converting USD to another currency multiplies by that currency's rate", () => {
  // 1 USD = 56.5 PHP, per the committed snapshot
  assert.equal(convertAmount(100, "USD", "PHP"), 5650);
});

test("converting another currency to USD divides by its own rate", () => {
  assert.equal(convertAmount(5650, "PHP", "USD"), 100);
});

test("converting between two non-USD currencies goes through USD", () => {
  // 100 GBP -> USD -> AUD
  const usd = 100 / 0.79;
  const expected = usd * 1.54;
  assert.ok(Math.abs(convertAmount(100, "GBP", "AUD") - expected) < 0.0001);
});

test("currency codes are matched case-insensitively", () => {
  assert.equal(convertAmount(100, "usd", "php"), 5650);
});

test("an unknown currency on either side returns the original amount unchanged, not an error", () => {
  assert.equal(convertAmount(100, "USD", "ZZZ"), 100);
  assert.equal(convertAmount(100, "ZZZ", "USD"), 100);
});
