// Pulls today's reference rates from Frankfurter (ECB daily rates, free, no API key) so Minimum pay can check a
// posting regardless of what currency it states. Called on its own cadence (apps/web/src/app/api/jobs/process),
// never from the filter path itself -- filters.ts only ever reads whatever was last cached.

const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=USD";

type FetchLike = (url: string) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

/** Fetches and validates today's rates. The response is untrusted external data: anything not a finite,
 *  positive number is dropped rather than trusted as-is. USD is always included at 1, since Frankfurter omits
 *  the base currency from its own `rates` object. */
export async function fetchCurrencyRates(fetchImpl: FetchLike = fetch): Promise<Record<string, number>> {
  const response = await fetchImpl(FRANKFURTER_URL);
  if (!response.ok) throw new Error(`Currency rate fetch failed: ${response.status}`);

  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("rates" in body)) {
    throw new Error("Currency rate fetch returned an unexpected shape");
  }
  const rawRates = (body as { rates: unknown }).rates;
  if (typeof rawRates !== "object" || rawRates === null) {
    throw new Error("Currency rate fetch returned an unexpected shape");
  }

  const rates: Record<string, number> = { USD: 1 };
  for (const [code, value] of Object.entries(rawRates as Record<string, unknown>)) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) rates[code.toUpperCase()] = value;
  }
  return rates;
}
