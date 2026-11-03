import type { JobPreferences } from "./preferences-store";

/** The owner-visible defaults every preference starts at (docs/product/job-finder.md, Preferences table) -- kept
 *  in its own module, with no database import, so a client component's bundle (the Overview's Preferences row,
 *  via `preferences-summary.ts`) can compare against it without pulling the Postgres driver into the browser. */
export const DEFAULTS: JobPreferences = {
  roles: [],
  skipWords: [],
  skipCompanies: [],
  countries: [],
  postedWithinDays: 14,
  minimumPay: null,
  maximumPay: null,
  payCurrency: "USD",
  payPeriod: "month",
  jobTypes: ["full_time", "contract"],
  workSetups: ["remote"],
  seniority: ["junior", "mid", "senior", "lead"],
  shifts: ["day", "mid"],
  agenciesHide: false,
};
