// A fixed currency-conversion snapshot (plans/jobs-multi-currency-pay.md, Slice 2), 1 USD in each currency as of
// around November 2026. Refreshed occasionally by a code change; never fetched live, and never read during
// filter evaluation (apps/web/src/features/jobs/filters.ts) -- only to suggest a starting Minimum pay value in
// Settings, which the owner can edit afterward.

const RATES_PER_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.54,
  NZD: 1.68,
  CAD: 1.39,
  PHP: 56.5,
  SGD: 1.34,
  INR: 84.0,
  JPY: 152.0,
  HKD: 7.79,
  AED: 3.67,
  MXN: 18.5,
  BRL: 5.7,
  ZAR: 18.0,
  CNY: 7.2,
  KRW: 1390,
  THB: 34.5,
  VND: 25400,
  IDR: 15800,
  MYR: 4.45,
};

/** Converts an amount between two currencies via the fixed snapshot. Either currency missing from the table
 *  returns the amount unchanged, since there's nothing to convert against -- the caller only ever suggests a
 *  currency it already knows a rate for, so this is a safety fallback, not the expected path. */
export function convertAmount(amount: number, fromCurrency: string, toCurrency: string): number {
  const fromRate = RATES_PER_USD[fromCurrency.toUpperCase()];
  const toRate = RATES_PER_USD[toCurrency.toUpperCase()];
  if (fromRate == null || toRate == null) return amount;
  return (amount / fromRate) * toRate;
}
