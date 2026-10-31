import { defaultCurrencyFor } from "./country-currency";
import { convertAmount } from "./currency-rates";
import type { PayThreshold } from "./preferences-store";

// Settings convenience only (plans/jobs-multi-currency-pay.md, Slice 2): suggests which currencies are worth
// configuring from the owner's selected Countries, and fills in a starting value for each from one anchor the
// owner types. `filters.ts`'s Minimum pay check never calls either of these -- it only ever reads the thresholds
// the owner has actually saved.

/** Currencies implied by `countries` that don't already have a configured threshold, deduplicated, in the order
 *  their country first appears. A country absent from the country-currency table contributes nothing, not an
 *  error. */
export function suggestedCurrencies(countries: string[], existing: PayThreshold[]): string[] {
  const configured = new Set(existing.map((threshold) => threshold.currency.toUpperCase()));
  const suggested: string[] = [];
  for (const country of countries) {
    const currency = defaultCurrencyFor(country);
    if (currency && !configured.has(currency) && !suggested.includes(currency)) suggested.push(currency);
  }
  return suggested;
}

/** Converts the anchor's amount into each of `currencies`, keeping the anchor's own period -- a one-time
 *  starting point for a currency the owner hasn't set yet, not a recalculation of anything already set. The
 *  anchor's own currency is never included in the result. */
export function autofillThresholds(anchor: PayThreshold, currencies: string[]): PayThreshold[] {
  return currencies
    .filter((currency) => currency.toUpperCase() !== anchor.currency.toUpperCase())
    .map((currency) => ({
      currency,
      minimumPay: convertAmount(anchor.minimumPay, anchor.currency, currency),
      payPeriod: anchor.payPeriod,
    }));
}
