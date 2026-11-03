import { NextResponse } from "next/server";
import { ratesAreStale, saveCachedRates } from "@/features/jobs/currency-rates-store";
import { fetchCurrencyRates } from "@/features/jobs/fetch-currency-rates";
import { listUsersWithPreferences } from "@/features/jobs/preferences-store";
import { processUserPostings } from "@/features/jobs/pipeline";
import { refreshRatesIfStale } from "@/features/jobs/refresh-currency-rates";
import { secretsMatch } from "@/features/jobs/secret";

export const runtime = "nodejs";

// Polled on its own cadence by an outside scheduler, separate from the scrape routes (plans/jobs-score.md,
// "Architecture decision"): a full-page fetch plus two AI calls per posting is too slow to run inline inside a
// scrape request. The secret goes in a header, not a query string, so it never lands in logs or analytics.
// Currency rates are a single shared snapshot (`job_currency_rates`), refreshed once per run, not per account.
// Extraction and scoring then run once per account that has saved Jobs settings (`listUsersWithPreferences`),
// each against that account's own pending postings and Profile; one account's failure is logged and skipped
// rather than blocking every other account's run.
export async function GET(request: Request) {
  const expectedSecret = process.env.JOBS_CHECK_SECRET;
  if (!expectedSecret) {
    console.error("jobs process: missing check-secret environment variable");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const secret = request.headers.get("x-jobs-check-secret") ?? "";
  if (!secretsMatch(secret, expectedSecret)) return NextResponse.json({ error: "bad secret" }, { status: 401 });

  await refreshRatesIfStale({
    now: new Date(),
    isStale: (now) => ratesAreStale(now),
    fetchRates: () => fetchCurrencyRates(),
    saveRates: (rates, fetchedAt) => saveCachedRates(rates, fetchedAt),
  });

  const userIds = await listUsersWithPreferences();
  let processed = 0;
  for (const userId of userIds) {
    try {
      const result = await processUserPostings(userId, secret, expectedSecret);
      processed += result.extracted + result.scored;
    } catch (error) {
      console.error(`jobs process: user ${userId} failed`, error instanceof Error ? error.message : error);
    }
  }

  return NextResponse.json({ ok: true, reason: "ok", processed, users: userIds.length });
}
