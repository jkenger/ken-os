import assert from "node:assert/strict";
import { test } from "node:test";
import { convertAmount } from "./currency-rates";

const rates = { USD: 1, GBP: 0.79, PHP: 56.5, AUD: 1.54 };

test("converting an amount to the same currency returns it unchanged, even with no rates at all", () => {
  assert.equal(convertAmount(80000, "USD", "USD", {}), 80000);
});

test("converting between two different currencies multiplies through USD", () => {
  assert.equal(convertAmount(100, "USD", "PHP", rates), 5650);
  assert.equal(convertAmount(5650, "PHP", "USD", rates), 100);
});

test("converting between two non-USD currencies goes through USD", () => {
  // 100 GBP -> USD -> AUD
  const usd = 100 / 0.79;
  const expected = usd * 1.54;
  const result = convertAmount(100, "GBP", "AUD", rates);
  assert.ok(result !== null && Math.abs(result - expected) < 0.0001);
});

test("currency codes are matched case-insensitively", () => {
  assert.equal(convertAmount(100, "usd", "php", rates), 5650);
});

test("a currency missing from the rates returns null, never a wrong number labeled as converted", () => {
  assert.equal(convertAmount(100, "USD", "ZZZ", rates), null);
  assert.equal(convertAmount(100, "ZZZ", "USD", rates), null);
});

test("no rates fetched yet means every cross-currency conversion is null, not a guess", () => {
  assert.equal(convertAmount(100, "USD", "PHP", {}), null);
});
