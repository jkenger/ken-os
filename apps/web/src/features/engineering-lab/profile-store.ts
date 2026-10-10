import { eq } from "drizzle-orm";
import { areaRows, nextMilestone, overallLevel, WEEKLY_HOURS, type AreaRow, type IntakeAnswers, type Level, type Milestone, type TopicState } from "@ken-os/domain";
import { db } from "@/lib/db";
import { labProfile } from "@/lib/schema";
import { activeRun, listRuns, type RunSummary } from "./assessment-store";
import { careers, findTopic, topicMap } from "./curriculum";
import { getAllProgress } from "./store";
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

export interface ProfileView {
  direction: { id: string; title: string } | null;
  /** When the latest assessment finished, or null before the first. */
  lastAssessed: string | null;
  rows: (AreaRow & { title: string; summary: string; remainingTopics: { id: string; title: string; state: TopicState }[] })[];
  overall: Level | null;
  milestone: (Milestone & { areaTitle: string; topicTitle: string }) | null;
  history: RunSummary[];
  /** The open assessment, if any. */
  openRunId: string | null;
}

/** Everything on Profile. Levels come only from Proven topics; the assessment orders the path and is kept as history. */
export async function getProfileView(userId: string): Promise<ProfileView> {
  const [profile, progress, history, open] = await Promise.all([getProfileRow(userId), getAllProgress(userId), listRuns(userId), activeRun(userId)]);
  const role = careers.roles.find((item) => item.id === profile?.direction) ?? null;
  const proven = new Set(progress.filter((item) => item.state === "PROVEN").map((item) => item.topicId));
  const state = new Map(progress.map((item) => [item.topicId, item.state]));
  const rows = areaRows(topicMap, careers, role, proven).map((row) => {
    const ladder = careers.areas.find((area) => area.id === row.area)!;
    return {
      ...row,
      title: topicMap.areas.find((area) => area.id === row.area)?.title ?? ladder.title,
      summary: ladder.summary,
      remainingTopics: row.remaining.map((id) => ({ id, title: findTopic(id)?.title ?? id, state: state.get(id) ?? "NOT_STARTED" })),
    };
  });
  const milestone = role ? nextMilestone(topicMap, careers, role, proven) : null;
  const finished = history.filter((run) => run.completedAt);
  return {
    direction: role ? { id: role.id, title: role.title } : null,
    lastAssessed: finished[0]?.completedAt ?? null,
    rows,
    overall: role ? overallLevel(rows) : null,
    milestone: milestone ? { ...milestone, areaTitle: rows.find((row) => row.area === milestone.area)!.title, topicTitle: findTopic(milestone.topicId)?.title ?? milestone.topicId } : null,
    history,
    openRunId: open?.id ?? null,
  };
}
