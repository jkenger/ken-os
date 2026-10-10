import { eq } from "drizzle-orm";
import { WEEKLY_HOURS, type IntakeAnswers } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labProfile } from "@/lib/schema";
import { careers } from "./curriculum";
import { LabInputError } from "./errors";

// The intake, target role and hours per week. Spec: docs/architecture/engineering-rebuild.md, sections 3 and 5.
// None of it is evidence: changing the direction recomputes the path and never touches answers or proofs.

export async function getProfileRow(userId: string) {
  const [row] = await db().select().from(labProfile).where(eq(labProfile.userId, userId)).limit(1);
  return row ?? null;
}

export async function upsertProfile(userId: string, values: Partial<Omit<typeof labProfile.$inferInsert, "userId">>) {
  await db().insert(labProfile).values({ userId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({ target: labProfile.userId, set: { ...values, updatedAt: new Date() } });
}

function role(value: unknown) {
  if (typeof value !== "string" || !careers.roles.some((item) => item.id === value)) throw new LabInputError("Choose a role");
  return value;
}

function hours(value: unknown) {
  const number = typeof value === "string" ? Number(value) : value;
  if (typeof number !== "number" || !Number.isInteger(number) || number < WEEKLY_HOURS.min || number > WEEKLY_HOURS.max) {
    throw new LabInputError(`Hours per week must be ${WEEKLY_HOURS.min} to ${WEEKLY_HOURS.max}`);
  }
  return number;
}

export function validIntake(value: unknown): IntakeAnswers {
  const input = (value ?? {}) as Record<string, unknown>;
  const building = typeof input.building === "string" ? input.building.trim() : "";
  if (building.length < 3) throw new LabInputError("Say what you're building");
  if (building.length > 1000) throw new LabInputError("Keep it under 1000 characters");
  return { building, role: role(input.role), weeklyHours: hours(input.weeklyHours) };
}

/** Saves the intake. Its role and hours also become the direction, which can change after the assessment. */
export async function saveIntake(userId: string, value: unknown) {
  const intake = validIntake(value);
  await upsertProfile(userId, { intake, direction: intake.role, weeklyHours: intake.weeklyHours });
  return { intake };
}

/** Saves the target role and hours per week. Never changes evidence. */
export async function saveDirection(userId: string, value: unknown) {
  const input = (value ?? {}) as Record<string, unknown>;
  const direction = role(input.role);
  const weeklyHours = hours(input.weeklyHours);
  await upsertProfile(userId, { direction, weeklyHours });
  return { direction, weeklyHours };
}

/** The Ken OS home's one-line Engineering card. */
export async function labSummary(userId: string): Promise<{ headline: string; detail: string } | null> {
  const profile = await getProfileRow(userId);
  const target = careers.roles.find((item) => item.id === profile?.direction);
  return { headline: target ? target.title : "Engineering", detail: "Open" };
}
