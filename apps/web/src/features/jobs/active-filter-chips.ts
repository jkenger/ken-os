import type { JobPreferences, JobType, Seniority, WorkSetup } from "./preferences-store";

const ALL_JOB_TYPES: JobType[] = ["full_time", "part_time", "contract", "internship", "temporary"];
const ALL_WORK_SETUPS: WorkSetup[] = ["remote", "hybrid", "on_site"];
const ALL_SENIORITIES: Seniority[] = ["junior", "mid", "senior", "lead"];

const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};
const WORK_SETUP_LABELS: Record<WorkSetup, string> = { remote: "Remote", hybrid: "Hybrid", on_site: "On site" };
const SENIORITY_LABELS: Record<Seniority, string> = { junior: "Junior", mid: "Mid", senior: "Senior", lead: "Lead" };

export type FilterChip = { key: string; label: string };

/** Falls back to "CODE amount" for a currency `Intl` doesn't recognize, rather than throwing. */
function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

/** Every currently-applied filter as one removable chip for the results bar (docs/mockups/job-finder.md,
 *  "Redesign": option C, "each active filter is one click to drop"). A dimension counts as active when it's
 *  actually excluding something -- a multi-select with every option checked excludes nothing, so it's silent.
 *  Posted within has no "unlimited" value in this schema, so it always shows; skip words and skip companies
 *  each get their own chip, one per entry, so dropping one never touches the others. */
export function activeFilterChips(preferences: JobPreferences): FilterChip[] {
  const chips: FilterChip[] = [];

  if (preferences.minimumPay !== null || preferences.maximumPay !== null) {
    const amount = preferences.minimumPay ?? preferences.maximumPay!;
    const formatted = formatCurrency(amount, preferences.payCurrency);
    const prefix = preferences.minimumPay !== null ? `${formatted}+` : `up to ${formatted}`;
    chips.push({ key: "pay", label: `${prefix} a ${preferences.payPeriod}` });
  }

  if (preferences.workSetups.length < ALL_WORK_SETUPS.length) {
    chips.push({ key: "workSetups", label: preferences.workSetups.map((w) => WORK_SETUP_LABELS[w]).join(", ") });
  }

  if (preferences.seniority.length < ALL_SENIORITIES.length) {
    chips.push({ key: "seniority", label: preferences.seniority.map((s) => SENIORITY_LABELS[s]).join(", ") });
  }

  if (preferences.jobTypes.length < ALL_JOB_TYPES.length) {
    chips.push({ key: "jobTypes", label: preferences.jobTypes.map((t) => JOB_TYPE_LABELS[t]).join(", ") });
  }

  for (const word of preferences.skipWords) chips.push({ key: `skipWord:${word}`, label: `Skip: ${word}` });
  for (const company of preferences.skipCompanies)
    chips.push({ key: `skipCompany:${company}`, label: `Skip: ${company}` });

  if (preferences.agenciesHide) chips.push({ key: "agencies", label: "No agencies" });

  const postedWithinLabel = preferences.postedWithinDays >= 365 ? "Anytime" : `${preferences.postedWithinDays} days`;
  chips.push({ key: "postedWithin", label: postedWithinLabel });

  return chips;
}

/** Drops one active filter chip, resetting only that dimension back to "no restriction" -- the rest of the
 *  owner's preferences are untouched. */
export function clearFilterChip(preferences: JobPreferences, key: string): JobPreferences {
  if (key === "pay") return { ...preferences, minimumPay: null, maximumPay: null };
  if (key === "workSetups") return { ...preferences, workSetups: ALL_WORK_SETUPS };
  if (key === "seniority") return { ...preferences, seniority: ALL_SENIORITIES };
  if (key === "jobTypes") return { ...preferences, jobTypes: ALL_JOB_TYPES };
  if (key === "agencies") return { ...preferences, agenciesHide: false };
  if (key === "postedWithin") return { ...preferences, postedWithinDays: 365 };
  if (key.startsWith("skipWord:")) {
    const word = key.slice("skipWord:".length);
    return { ...preferences, skipWords: preferences.skipWords.filter((w) => w !== word) };
  }
  if (key.startsWith("skipCompany:")) {
    const company = key.slice("skipCompany:".length);
    return { ...preferences, skipCompanies: preferences.skipCompanies.filter((c) => c !== company) };
  }
  return preferences;
}
