import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobPreferences } from "@/lib/schema";
import { JobsInputError } from "./api";

export type PayPeriod = "hour" | "day" | "week" | "month" | "year";
export type JobType = "full_time" | "part_time" | "contract" | "internship" | "temporary";
export type WorkSetup = "remote" | "hybrid" | "on_site";

const PAY_PERIODS: PayPeriod[] = ["hour", "day", "week", "month", "year"];
const JOB_TYPES: JobType[] = ["full_time", "part_time", "contract", "internship", "temporary"];
const WORK_SETUPS: WorkSetup[] = ["remote", "hybrid", "on_site"];

export type PayThreshold = { currency: string; minimumPay: number; payPeriod: PayPeriod };

export type JobPreferences = {
  skipWords: string[];
  skipCompanies: string[];
  postedWithinDays: number;
  payThresholds: PayThreshold[];
  jobTypes: JobType[];
  workSetups: WorkSetup[];
  countries: string[];
  agenciesHide: boolean;
};

const DEFAULTS: JobPreferences = {
  skipWords: [],
  skipCompanies: [],
  postedWithinDays: 14,
  payThresholds: [],
  jobTypes: ["full_time", "contract"],
  workSetups: ["remote"],
  countries: ["US", "AU", "GB"],
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

/** A minimum per currency (plans/jobs-multi-currency-pay.md): the owner sets one threshold for each currency
 *  they want checked, keyed to the posting's own stated currency, never converted between currencies. */
function parsePayThresholds(value: unknown): PayThreshold[] {
  if (!Array.isArray(value)) throw new JobsInputError("Pay thresholds must be a list");
  const seen = new Set<string>();
  return value.map((entry) => {
    if (typeof entry !== "object" || entry === null)
      throw new JobsInputError("Each pay threshold must have a currency, a minimum pay and a period");
    const { currency, minimumPay, payPeriod } = entry as Record<string, unknown>;

    if (typeof currency !== "string" || !currency.trim())
      throw new JobsInputError("Pay threshold currency is required");
    const code = currency.trim().toUpperCase();
    if (seen.has(code)) throw new JobsInputError(`Pay threshold currency ${code} is configured more than once`);
    seen.add(code);

    if (typeof minimumPay !== "number" || minimumPay < 0)
      throw new JobsInputError("Pay threshold minimum pay must be a number, 0 or more");

    if (typeof payPeriod !== "string" || !PAY_PERIODS.includes(payPeriod as PayPeriod))
      throw new JobsInputError(`Pay threshold period must be one of: ${PAY_PERIODS.join(", ")}`);

    return { currency: code, minimumPay, payPeriod: payPeriod as PayPeriod };
  });
}

/** Validates a Settings save (docs/product/job-finder.md). Untrusted input from the request body. */
export function parsePreferences(input: Record<string, unknown>): JobPreferences {
  const postedWithinDays = input.postedWithinDays;
  if (typeof postedWithinDays !== "number" || !Number.isInteger(postedWithinDays) || postedWithinDays < 0)
    throw new JobsInputError("Posted within must be a whole number of days, 0 or more");

  const agenciesHide = input.agenciesHide;
  if (typeof agenciesHide !== "boolean") throw new JobsInputError("Agencies hide must be true or false");

  return {
    skipWords: cleanList(input.skipWords, "Skip words"),
    skipCompanies: cleanList(input.skipCompanies, "Skip companies"),
    postedWithinDays,
    payThresholds: parsePayThresholds(input.payThresholds),
    jobTypes: cleanEnumList(input.jobTypes, "Job types", JOB_TYPES),
    workSetups: cleanEnumList(input.workSetups, "Work setups", WORK_SETUPS),
    countries: cleanList(input.countries, "Countries").map((code) => code.toUpperCase()),
    agenciesHide,
  };
}

export async function getPreferences(userId: string): Promise<JobPreferences> {
  const [row] = await db().select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
  if (!row) return DEFAULTS;
  return {
    skipWords: row.skipWords,
    skipCompanies: row.skipCompanies,
    postedWithinDays: row.postedWithinDays,
    payThresholds: row.payThresholds,
    jobTypes: row.jobTypes,
    workSetups: row.workSetups,
    countries: row.countries,
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
