import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobCurrencyRates } from "@/lib/schema";

const SINGLETON_ID = "global";
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/** The last fetched currency rates, or an empty map before the first successful fetch -- `convertAmount` treats
 *  an empty map as "can't convert," never a wrong number. */
export async function getCachedRates(): Promise<Record<string, number>> {
  const [row] = await db().select().from(jobCurrencyRates).where(eq(jobCurrencyRates.id, SINGLETON_ID)).limit(1);
  return row?.rates ?? {};
}

/** True when there's no cached snapshot yet, or the one cached is more than a day old. */
export async function ratesAreStale(now: Date): Promise<boolean> {
  const [row] = await db().select().from(jobCurrencyRates).where(eq(jobCurrencyRates.id, SINGLETON_ID)).limit(1);
  if (!row) return true;
  return now.getTime() - row.fetchedAt.getTime() > STALE_AFTER_MS;
}

export async function saveCachedRates(rates: Record<string, number>, fetchedAt: Date): Promise<void> {
  await db()
    .insert(jobCurrencyRates)
    .values({ id: SINGLETON_ID, rates, fetchedAt })
    .onConflictDoUpdate({ target: jobCurrencyRates.id, set: { rates, fetchedAt } });
}
