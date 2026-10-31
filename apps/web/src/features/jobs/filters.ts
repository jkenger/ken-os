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
  /** True once extraction has run and the posting's own text said *anything* about who may apply, including
   *  "open to everyone" -- distinct from `false` (extraction ran, found nothing) and "not yet processed"
   *  (`undefined` in a plain object literal, `null` from a nullable DB column -- both mean the same thing here
   *  and must be treated alike). `countries` only carries meaning when this is `true`. */
  eligibilityStated?: boolean | null;
  countries?: string[] | null;
  isAgency?: boolean;
};

/** The strict filters (docs/product/job-finder.md): skip words, skip companies, posted within, and — once a
 *  posting has been through `/api/jobs/process` — Minimum/Maximum pay, Job type, Work setup, Countries and
 *  Agencies. A not-yet-processed posting's extracted fields are all `undefined` (not `false`/`[]`), so only the
 *  first three checks apply -- never confused with a processed posting that explicitly found no eligibility
 *  language. Checked in this order, the first match wins, so a posting always has exactly one reason when it's
 *  filtered. `context.targetCountry` is the owner's own country (from Profile, defaulting to PH) -- there's no
 *  separate owner-set Countries list. Unlike Minimum/Maximum pay's "not stated, don't filter" rule, a
 *  *processed* posting that said nothing about eligibility at all is filtered, not shown: most scraped postings
 *  never say anything, and showing them by default let through local, non-PH-reachable roles indistinguishable
 *  from ones genuinely open everywhere. `eligibilityStated` is what makes that distinction possible: `false`
 *  means extraction ran and found no eligibility language at all ("Country: not stated"); `true` with an empty
 *  `countries` means the posting explicitly said it's open to everyone, which is never filtered; `true` with a
 *  list checks membership as before. `context.currencyRates` is the last cached snapshot a posting's own stated
 *  pay is converted through before comparing to Minimum/Maximum pay; missing or unconvertable pay is still never
 *  filtered -- that tradeoff only applies to Countries. */
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

  if (posting.eligibilityStated !== undefined && posting.eligibilityStated !== null) {
    if (!posting.eligibilityStated) return "Country: not stated";
    const countries = posting.countries ?? [];
    if (countries.length > 0) {
      const eligible = countries.some((code) => code.toUpperCase() === targetCountry.toUpperCase());
      if (!eligible) return `Country: ${countries[0]}`;
    }
  }

  if (posting.isAgency && preferences.agenciesHide) return "Recruiting agency";

  return null;
}
