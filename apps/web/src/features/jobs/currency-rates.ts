/** Converts an amount between two currencies given a USD-based rates map (1 USD = N of that currency), or null
 *  when conversion isn't possible -- either currency missing from `ratesPerUsd`, which happens before the first
 *  successful fetch or when a posting states a currency outside what the rate source covers. The same currency
 *  on both sides always succeeds, even with an empty or stale rates map, since no conversion is needed.
 *  `filters.ts` doesn't filter a posting for pay when this returns null, the same as when a posting states no
 *  pay at all -- it never guesses a number and labels it converted. */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  ratesPerUsd: Record<string, number>,
): number | null {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return amount;
  const fromRate = ratesPerUsd[from];
  const toRate = ratesPerUsd[to];
  if (fromRate == null || toRate == null) return null;
  return (amount / fromRate) * toRate;
}
