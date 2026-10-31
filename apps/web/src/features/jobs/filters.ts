import type { JobPreferences } from "./preferences-store";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The strict filters step 1 can evaluate from list fields alone (docs/product/job-finder.md): skip words, skip
 *  companies, posted within. The pay/type/setup/country filters need the AI-extracted fields from step 2. Checked
 *  in this order, the first match wins, so a posting always has exactly one reason when it's filtered. */
export function filterReason(
  posting: { title: string; company: string; firstSeenAt: Date },
  preferences: JobPreferences,
  now: Date = new Date(),
): string | null {
  const title = posting.title.toLowerCase();
  const skipWord = preferences.skipWords.find((word) => title.includes(word.toLowerCase()));
  if (skipWord) return `Skip word: ${skipWord}`;

  const company = posting.company.toLowerCase();
  const skipCompany = preferences.skipCompanies.find((name) => company === name.toLowerCase());
  if (skipCompany) return `Skip company: ${skipCompany}`;

  const ageDays = (now.getTime() - posting.firstSeenAt.getTime()) / DAY_MS;
  if (ageDays > preferences.postedWithinDays) return `Posted over ${preferences.postedWithinDays} days ago`;

  return null;
}
