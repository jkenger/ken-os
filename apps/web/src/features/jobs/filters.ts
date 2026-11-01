import { convertAmount } from "./currency-rates";
import type { JobPreferences, JobType, PayPeriod, WorkSetup } from "./preferences-store";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How many of one period fit in a month, on average, for comparing pay stated in different periods
 *  (docs/product/job-finder.md: "Hourly and yearly postings are converted to it"). */
const PERIODS_PER_MONTH: Record<PayPeriod, number> = {
  hour: (52 * 40) / 12,
  day: (52 * 5) / 12,
  week: 52 / 12,
  month: 1,
  year: 1 / 12,
};

function monthlyAmount(amount: number, period: PayPeriod): number {
  return amount * PERIODS_PER_MONTH[period];
}

export type FilterablePosting = {
  title: string;
  company: string;
  firstSeenAt: Date;
  payAmount?: number | null;
  payCurrency?: string | null;
  payPeriod?: PayPeriod | null;
  jobType?: JobType | null;
  workSetup?: WorkSetup | null;
  seniority?: "junior" | "mid" | "senior" | "lead" | null;
  /** True once extraction has run and the posting's own text said *anything* about who may apply, including
   *  "open to everyone". `countries` only carries meaning, and is only checked, when this is `true` -- `false`
   *  (extraction ran, found nothing) and not-yet-processed (`undefined` in a plain object literal, `null` from a
   *  nullable DB column) are both never filtered for Country (see the Countries check below for why). */
  eligibilityStated?: boolean | null;
  countries?: string[] | null;
  isAgency?: boolean;
};

/** The strict filters (docs/product/job-finder.md): skip words, skip companies, posted within, and — once a
 *  posting has been through `/api/jobs/process` — Minimum/Maximum pay, Job type, Work setup, Countries and
 *  Agencies. Checked in this order, the first match wins, so a posting always has exactly one reason when it's
 *  filtered. `context.targetCountry` is the owner's own country (from Profile, defaulting to PH) -- there's no
 *  separate owner-set Countries list.
 *
 *  Countries only filters a posting that *explicitly* lists countries excluding the target -- same "not stated,
 *  don't filter" rule as Minimum/Maximum pay. An earlier version filtered any processed posting that said nothing
 *  about eligibility at all ("Country: not stated"), on the theory that showing it by default let through local,
 *  non-PH-reachable roles indistinguishable from ones genuinely open everywhere. In practice LinkedIn and Indeed's
 *  public pages carry no structured eligibility field at all (confirmed against JobSpy's own source --
 *  github.com/speedyapply/JobSpy), so that policy ended up hiding nearly every LinkedIn/Indeed posting, including
 *  ones that would genuinely be fine for the owner -- a worse trade than the one it was meant to fix. Reverted
 *  (plans/jobs-filters-and-wwr-source.md): `eligibilityStated` now only gates whether `countries` is trusted at
 *  all, not whether the posting is shown. `false` or not-yet-processed (`undefined`/`null`) never filters for
 *  Country. `true` with an empty `countries` means the posting explicitly said it's open to everyone, also never
 *  filtered. `true` with a non-empty list checks membership as before. `context.currencyRates` is the last cached
 *  snapshot a posting's own stated pay is converted through before comparing to Minimum/Maximum pay; missing or
 *  unconvertable pay is still never filtered -- that tradeoff only applies to Countries. */
export function filterReason(
  posting: FilterablePosting,
  preferences: JobPreferences,
  now: Date = new Date(),
  context: { targetCountry?: string; currencyRates?: Record<string, number> } = {},
): string | null {
  const targetCountry = context.targetCountry ?? "PH";
  const currencyRates = context.currencyRates ?? {};

  const title = posting.title.toLowerCase();
  const skipWord = preferences.skipWords.find((word) => title.includes(word.toLowerCase()));
  if (skipWord) return `Skip word: ${skipWord}`;

  const company = posting.company.toLowerCase();
  const skipCompany = preferences.skipCompanies.find((name) => company === name.toLowerCase());
  if (skipCompany) return `Skip company: ${skipCompany}`;

  const ageDays = (now.getTime() - posting.firstSeenAt.getTime()) / DAY_MS;
  if (ageDays > preferences.postedWithinDays) return `Posted over ${preferences.postedWithinDays} days ago`;

  if (
    (preferences.minimumPay !== null || preferences.maximumPay !== null) &&
    posting.payAmount != null &&
    posting.payCurrency &&
    posting.payPeriod
  ) {
    const converted = convertAmount(posting.payAmount, posting.payCurrency, preferences.payCurrency, currencyRates);
    if (converted != null) {
      const postingMonthly = monthlyAmount(converted, posting.payPeriod);
      if (preferences.minimumPay !== null) {
        const minimumMonthly = monthlyAmount(preferences.minimumPay, preferences.payPeriod);
        if (postingMonthly < minimumMonthly) return "Below minimum pay";
      }
      if (preferences.maximumPay !== null) {
        const maximumMonthly = monthlyAmount(preferences.maximumPay, preferences.payPeriod);
        if (postingMonthly > maximumMonthly) return "Above maximum pay";
      }
    }
  }

  if (posting.jobType && !preferences.jobTypes.includes(posting.jobType)) return `Job type: ${posting.jobType}`;

  if (posting.workSetup && !preferences.workSetups.includes(posting.workSetup))
    return `Work setup: ${posting.workSetup}`;

  if (posting.seniority && !preferences.seniority.includes(posting.seniority)) return `Seniority: ${posting.seniority}`;

  if (posting.eligibilityStated) {
    const countries = posting.countries ?? [];
    if (countries.length > 0) {
      const eligible = countries.some((code) => code.toUpperCase() === targetCountry.toUpperCase());
      if (!eligible) return `Country: ${countries[0]}`;
    }
  }

  if (posting.isAgency && preferences.agenciesHide) return "Recruiting agency";

  return null;
}
