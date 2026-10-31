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
  countries?: string[] | null;
  isAgency?: boolean;
};

/** The strict filters (docs/product/job-finder.md): skip words, skip companies, posted within, and — once a
 *  posting has been through `/api/jobs/process` — Minimum pay, Job type, Work setup, Countries and Agencies.
 *  A not-yet-processed posting's extracted fields are all undefined, so only the first three checks apply.
 *  Checked in this order, the first match wins, so a posting always has exactly one reason when it's filtered. */
export function filterReason(
  posting: FilterablePosting,
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

  if (
    preferences.minimumPay !== null &&
    posting.payAmount != null &&
    posting.payCurrency &&
    posting.payPeriod &&
    posting.payCurrency.toUpperCase() === preferences.payCurrency.toUpperCase()
  ) {
    const postingMonthly = monthlyAmount(posting.payAmount, posting.payPeriod);
    const minimumMonthly = monthlyAmount(preferences.minimumPay, preferences.payPeriod);
    if (postingMonthly < minimumMonthly) return "Below minimum pay";
  }

  if (posting.jobType && !preferences.jobTypes.includes(posting.jobType)) return `Job type: ${posting.jobType}`;

  if (posting.workSetup && !preferences.workSetups.includes(posting.workSetup))
    return `Work setup: ${posting.workSetup}`;

  if (posting.countries && posting.countries.length > 0) {
    const allowed = new Set(preferences.countries.map((code) => code.toUpperCase()));
    const eligible = posting.countries.some((code) => allowed.has(code.toUpperCase()));
    if (!eligible) return `Country: ${posting.countries[0]}`;
  }

  if (posting.isAgency && preferences.agenciesHide) return "Recruiting agency";

  return null;
}
