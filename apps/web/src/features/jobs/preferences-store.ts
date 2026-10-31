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

export type JobPreferences = {
  skipWords: string[];
  skipCompanies: string[];
  postedWithinDays: number;
  minimumPay: number | null;
  payCurrency: string;
  payPeriod: PayPeriod;
  jobTypes: JobType[];
  workSetups: WorkSetup[];
  agenciesHide: boolean;
};

const DEFAULTS: JobPreferences = {
  skipWords: [],
  skipCompanies: [],
  postedWithinDays: 14,
  minimumPay: null,
  payCurrency: "USD",
  payPeriod: "month",
  jobTypes: ["full_time", "contract"],
  workSetups: ["remote"],
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

  const payCurrency = input.payCurrency;
  if (typeof payCurrency !== "string" || !payCurrency.trim()) throw new JobsInputError("Pay currency is required");

  const payPeriod = input.payPeriod;
  if (typeof payPeriod !== "string" || !PAY_PERIODS.includes(payPeriod as PayPeriod))
    throw new JobsInputError(`Pay period must be one of: ${PAY_PERIODS.join(", ")}`);

  const agenciesHide = input.agenciesHide;
  if (typeof agenciesHide !== "boolean") throw new JobsInputError("Agencies hide must be true or false");

  return {
    skipWords: cleanList(input.skipWords, "Skip words"),
    skipCompanies: cleanList(input.skipCompanies, "Skip companies"),
    postedWithinDays,
    minimumPay,
    payCurrency: payCurrency.trim().toUpperCase(),
    payPeriod: payPeriod as PayPeriod,
    jobTypes: cleanEnumList(input.jobTypes, "Job types", JOB_TYPES),
    workSetups: cleanEnumList(input.workSetups, "Work setups", WORK_SETUPS),
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
    minimumPay: row.minimumPay,
    payCurrency: row.payCurrency,
    payPeriod: row.payPeriod,
    jobTypes: row.jobTypes,
    workSetups: row.workSetups,
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
