// Refreshes the cached currency rates when they're stale (plans: Jobs multi-currency pay, single-currency
// revision). A failed fetch never throws -- whatever's already cached (even if stale) keeps being used rather
// than breaking a process run over a flaky rate source.

export async function refreshRatesIfStale(params: {
  now: Date;
  isStale: (now: Date) => Promise<boolean>;
  fetchRates: () => Promise<Record<string, number>>;
  saveRates: (rates: Record<string, number>, fetchedAt: Date) => Promise<void>;
}): Promise<{ refreshed: boolean }> {
  const stale = await params.isStale(params.now);
  if (!stale) return { refreshed: false };

  try {
    const rates = await params.fetchRates();
    await params.saveRates(rates, params.now);
    return { refreshed: true };
  } catch {
    return { refreshed: false };
  }
}
