import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchCurrencyRates } from "./fetch-currency-rates";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test("parses the rates response into a USD-based map, with USD itself included", async () => {
  const rates = await fetchCurrencyRates(
    async () => jsonResponse({ amount: 1, base: "USD", date: "2026-11-01", rates: { EUR: 0.92, PHP: 56.5 } }) as never,
  );
  assert.deepEqual(rates, { USD: 1, EUR: 0.92, PHP: 56.5 });
});

test("currency codes in the response are upper-cased", async () => {
  const rates = await fetchCurrencyRates(async () => jsonResponse({ rates: { php: 56.5 } }) as never);
  assert.deepEqual(rates, { USD: 1, PHP: 56.5 });
});

test("a non-positive or non-numeric rate is dropped, not trusted as-is", async () => {
  const rates = await fetchCurrencyRates(
    async () => jsonResponse({ rates: { EUR: 0.92, BAD: -1, WORSE: "nope", ZERO: 0 } }) as never,
  );
  assert.deepEqual(rates, { USD: 1, EUR: 0.92 });
});

test("a non-ok response throws, instead of silently returning nothing useful", async () => {
  await assert.rejects(() => fetchCurrencyRates(async () => jsonResponse({}, 503) as never));
});

test("a response missing the rates field throws", async () => {
  await assert.rejects(() => fetchCurrencyRates(async () => jsonResponse({ amount: 1 }) as never));
});
