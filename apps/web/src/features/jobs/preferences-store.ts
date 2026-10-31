import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobPreferences } from "@/lib/schema";
import { JobsInputError } from "./api";

export type JobPreferences = {
  skipWords: string[];
  skipCompanies: string[];
  postedWithinDays: number;
};

const DEFAULTS: JobPreferences = { skipWords: [], skipCompanies: [], postedWithinDays: 14 };

function cleanList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string"))
    throw new JobsInputError(`${field} must be a list of words`);
  return value.map((item) => item.trim()).filter(Boolean);
}

/** Validates a Settings save (docs/product/job-finder.md). Untrusted input from the request body. */
export function parsePreferences(input: Record<string, unknown>): JobPreferences {
  const postedWithinDays = input.postedWithinDays;
  if (typeof postedWithinDays !== "number" || !Number.isInteger(postedWithinDays) || postedWithinDays < 0)
    throw new JobsInputError("Posted within must be a whole number of days, 0 or more");
  return {
    skipWords: cleanList(input.skipWords, "Skip words"),
    skipCompanies: cleanList(input.skipCompanies, "Skip companies"),
    postedWithinDays,
  };
}

export async function getPreferences(userId: string): Promise<JobPreferences> {
  const [row] = await db().select().from(jobPreferences).where(eq(jobPreferences.userId, userId)).limit(1);
  if (!row) return DEFAULTS;
  return { skipWords: row.skipWords, skipCompanies: row.skipCompanies, postedWithinDays: row.postedWithinDays };
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
