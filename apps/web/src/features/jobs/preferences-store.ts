import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobPreferences } from "@/lib/schema";
import { JobsInputError } from "./api";

export type PayPeriod = "hour" | "day" | "week" | "month" | "year";
export type JobType = "full_time" | "part_time" | "contract" | "internship" | "temporary";
export type WorkSetup = "remote" | "hybrid" | "on_site";
export type Seniority = "junior" | "mid" | "senior" | "lead";
/** The three owner-choosable shift windows from `shift.ts`'s label set -- "Flexible" and "Not listed" aren't here
 *  because they're never a choice, only what a posting falls back to when it doesn't state hours; a posting with
 *  no stated shift is shown regardless, the same "don't silently filter beyond what's explicitly asked" rule as
 *  every other preference in this file (docs/product/job-finder.md, Preferences table: "Shifts ... Shown ...
 *  Night shift postings are marked Outside shifts"). */
export type Shift = "day" | "mid" | "night";

const PAY_PERIODS: PayPeriod[] = ["hour", "day", "week", "month", "year"];
const JOB_TYPES: JobType[] = ["full_time", "part_time", "contract", "internship", "temporary"];
const WORK_SETUPS: WorkSetup[] = ["remote", "hybrid", "on_site"];
const SENIORITIES: Seniority[] = ["junior", "mid", "senior", "lead"];
const SHIFTS: Shift[] = ["day", "mid", "night"];

export type JobPreferences = {
  /** The owner's own edited role list, searched instead of the Profile's live-derived roles
   *  (docs/mockups/job-finder.md, "Redesign": Specialization, imported then editable). Empty means "none
   *  edited yet" -- `check/freehire/route.ts` falls back to `deriveRoles(profile)` in that case, never silently
   *  searching nothing. */
  roles: string[];
  skipWords: string[];
  skipCompanies: string[];
  /** Empty means no Country restriction -- the same "don't silently filter beyond what's explicitly asked" rule
   *  as every other list here. Checked against a posting's own stated countries, not against the owner's Profile
   *  country (there's no such link anymore). */
  countries: string[];
  postedWithinDays: number;
  minimumPay: number | null;
  maximumPay: number | null;
  payCurrency: string;
  payPeriod: PayPeriod;
  jobTypes: JobType[];
  workSetups: WorkSetup[];
  /** All four by default: a brand-new owner who's never touched this control gets no seniority filtering, the
   *  same "don't silently filter beyond what's explicitly asked" rule every other filter here follows. */
  seniority: Seniority[];
  /** Day and Mid by default (docs/product/job-finder.md, Preferences table) -- a brand-new owner is a Philippines
   *  day/mid worker by default, so Night shift postings start out marked Outside shifts rather than hidden; this
   *  is shown, not a strict filter, so an empty list is also valid and just means no shift is marked that way. */
  shifts: Shift[];
  agenciesHide: boolean;
};

const DEFAULTS: JobPreferences = {
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
  seniority: SENIORITIES,
  shifts: ["day", "mid"],
  agenciesHide: false,
};

function cleanList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    throw new JobsInputError(`${field} must be a list of words`);
  return value.map((item) => item.trim()).filter(Boolean);
}

function cleanEnumList<T extends string>(value: unknown, field: string, allowed: T[]): T[] {
  if (!Array.isArray(value) || !value.every((item): item is T => allowed.includes(item as T)))
    throw new JobsInputError(`${field} must be one of: ${allowed.join(", ")}`);
  return value;
}

/** Validates a Settings save (docs/product/job-finder.md). Untrusted input from the request body. */
export function parsePreferences(input: Record<string, unknown>): JobPreferences {
  const postedWithinDays = input.postedWithinDays;
  if (typeof postedWithinDays !== "number" || !Number.isInteger(postedWithinDays) || postedWithinDays < 0)
    throw new JobsInputError("Posted within must be a whole number of days, 0 or more");

  const minimumPay = input.minimumPay;
  if (minimumPay !== null && (typeof minimumPay !== "number" || minimumPay < 0))
    throw new JobsInputError("Minimum pay must be a number, 0 or more, or empty");

  const maximumPay = input.maximumPay;
  if (maximumPay !== null && (typeof maximumPay !== "number" || maximumPay < 0))
    throw new JobsInputError("Maximum pay must be a number, 0 or more, or empty");
  if (minimumPay !== null && maximumPay !== null && maximumPay < minimumPay)
    throw new JobsInputError("Maximum pay must be greater than or equal to minimum pay");

  const payCurrency = input.payCurrency;
  if (typeof payCurrency !== "string" || !payCurrency.trim()) throw new JobsInputError("Pay currency is required");

  const payPeriod = input.payPeriod;
  if (typeof payPeriod !== "string" || !PAY_PERIODS.includes(payPeriod as PayPeriod))
    throw new JobsInputError(`Pay period must be one of: ${PAY_PERIODS.join(", ")}`);

  const agenciesHide = input.agenciesHide;
  if (typeof agenciesHide !== "boolean") throw new JobsInputError("Agencies hide must be true or false");

  return {
    roles: cleanList(input.roles, "Roles"),
    skipWords: cleanList(input.skipWords, "Skip words"),
    skipCompanies: cleanList(input.skipCompanies, "Skip companies"),
    countries: cleanList(input.countries, "Countries"),
    postedWithinDays,
    minimumPay,
    maximumPay,
    payCurrency: payCurrency.trim().toUpperCase(),
    payPeriod: payPeriod as PayPeriod,
    jobTypes: cleanEnumList(input.jobTypes, "Job types", JOB_TYPES),
    workSetups: cleanEnumList(input.workSetups, "Work setups", WORK_SETUPS),
    seniority: cleanEnumList(input.seniority, "Seniority", SENIORITIES),
    shifts: cleanEnumList(input.shifts, "Shifts", SHIFTS),
    agenciesHide,
  };
}

export async function getPreferences(userId: string): Promise<JobPreferences> {
  const [row] = await db().select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
  if (!row) return DEFAULTS;
  return {
    roles: row.roles,
    skipWords: row.skipWords,
    skipCompanies: row.skipCompanies,
    countries: row.countries,
    postedWithinDays: row.postedWithinDays,
    minimumPay: row.minimumPay,
    maximumPay: row.maximumPay,
    payCurrency: row.payCurrency,
    payPeriod: row.payPeriod,
    jobTypes: row.jobTypes,
    workSetups: row.workSetups,
    seniority: row.seniority,
    shifts: row.shifts,
    agenciesHide: row.agenciesHide,
  };
}

export async function savePreferences(userId: string, preferences: JobPreferences): Promise<void> {
  await db()
    .insert(jobPreferences)
    .values({ userId, ...preferences, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: jobPreferences.userId,
      set: { ...preferences, updatedAt: new Date() },
    });
}
