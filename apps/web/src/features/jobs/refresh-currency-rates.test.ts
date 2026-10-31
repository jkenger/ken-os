import assert from "node:assert/strict";
import { test } from "node:test";
import { refreshRatesIfStale } from "./refresh-currency-rates";

const now = new Date("2026-11-01T00:00:00Z");

test("rates that aren't stale are never fetched or saved", async () => {
  let fetched = false;
  const result = await refreshRatesIfStale({
    now,
    isStale: async () => false,
    fetchRates: async () => {
      fetched = true;
      return { USD: 1 };
    },
    saveRates: async () => {},
  });
  assert.equal(result.refreshed, false);
  assert.equal(fetched, false);
});

test("stale rates are fetched and saved with the given timestamp", async () => {
  const saved: unknown[] = [];
  const result = await refreshRatesIfStale({
    now,
    isStale: async () => true,
    fetchRates: async () => ({ USD: 1, PHP: 56.5 }),
    saveRates: async (rates, fetchedAt) => {
      saved.push({ rates, fetchedAt });
    },
  });
  assert.equal(result.refreshed, true);
  assert.deepEqual(saved, [{ rates: { USD: 1, PHP: 56.5 }, fetchedAt: now }]);
});

test("a failed fetch is swallowed, not thrown, and nothing is saved", async () => {
  let saveCalled = false;
  const result = await refreshRatesIfStale({
    now,
    isStale: async () => true,
    fetchRates: async () => {
      throw new Error("network down");
    },
    saveRates: async () => {
      saveCalled = true;
    },
  });
  assert.equal(result.refreshed, false);
  assert.equal(saveCalled, false);
});

test("a failed save is also swallowed, not thrown", async () => {
  const result = await refreshRatesIfStale({
    now,
    isStale: async () => true,
    fetchRates: async () => ({ USD: 1 }),
    saveRates: async () => {
      throw new Error("db down");
    },
  });
  assert.equal(result.refreshed, false);
});
