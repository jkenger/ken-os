import { and, desc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { guideTurn } from "@ken-os/agents";
import {
  addedChapterId, areaLevel, nextScreenQuestion, toPublicItem, chapterStates, computeProgress, isArea, isoWeek, measuredHoursPerTopic, roadmap, roleDistance,
  type AddedChapter, type Area, type AreaLevel, type AttemptRecord, type ChapterScreen, type ChapterState, type GuideMessage, type IntakeAnswers, type Label,
  type ModuleInfo, type PublicItem, type RoadmapStep, type RoleDistance, type Status, type TopicProgress,
} from "@ken-os/domain";
import { db } from "@/lib/db";
import { labAssessmentRuns, labAttempts, labChapterScreens, labLessons, labProfile, labRadarItems } from "@/lib/schema";
import { baselineAttempts, careers, findTopic, topicMap } from "./curriculum";
import { LabInputError } from "./errors";
import { activeRun, completedBaseline } from "./run-state";
import { assertBudget } from "./store";

// The career profile on the lab home. Design: docs/architecture/engineering-lab-profile.md, sections 2, 3 and 5.

export async function getProfileRow(userId: string) {
  const [row] = await db().select().from(labProfile).where(eq(labProfile.userId, userId)).limit(1);
  return row ?? null;
}

async function upsertProfile(userId: string, values: Partial<typeof labProfile.$inferInsert>) {
  await db().insert(labProfile).values({ userId, ...values, updatedAt: new Date() })
    .onConflictDoUpdate({ target: labProfile.userId, set: { ...values, updatedAt: new Date() } });
}

export function validIntake(value: unknown): IntakeAnswers {
  const input = (value ?? {}) as Record<string, unknown>;
  const text = (field: string) => {
    const item = input[field];
    if (typeof item !== "string" || !item.trim() || item.length > 1000) throw new LabInputError(`${field} must be text up to 1000 characters.`);
    return item.trim();
  };
  const hours = Number(input.weeklyHours);
  if (!Number.isInteger(hours) || hours < 1 || hours > 80) throw new LabInputError("weeklyHours must be a whole number from 1 to 80.");
  return { building: text("building"), stack: text("stack"), aiWork: text("aiWork"), weeklyHours: hours };
}

export async function saveIntake(userId: string, intake: IntakeAnswers) {
  await upsertProfile(userId, { intake });
  return { saved: true };
}

export async function chooseDirection(userId: string, roleId: string | null) {
  if (roleId !== null && !careers.roles.some((role) => role.id === roleId)) throw new LabInputError("Unknown role.", 404);
  if (roleId && !(await completedBaseline(userId))) throw new LabInputError("Pick a direction after your baseline, once you can see your shape.", 409);
  await upsertProfile(userId, { direction: roleId });
  return { direction: roleId };
}

/** Adds a chapter the Guide suggested, after the owner approved it. It joins the outline unwritten. */
export async function addChapter(userId: string, input: { title: string; area: string; reason: string }) {
  const title = input.title.trim();
  if (!title || title.length > 80) throw new LabInputError("A chapter title is 1 to 80 characters.");
  if (!isArea(input.area)) throw new LabInputError("Unknown area.");
  const profile = await getProfileRow(userId);
  const added = profile?.addedChapters ?? [];
  const id = addedChapterId(title);
  if (added.some((chapter) => chapter.id === id) || topicMap.modules.some((module) => module.title.toLowerCase() === title.toLowerCase())) {
    throw new LabInputError("That chapter is already in your outline.", 409);
  }
  const chapter: AddedChapter = { id, title, area: input.area, reason: input.reason.trim().slice(0, 300), addedAt: new Date().toISOString() };
  await upsertProfile(userId, { addedChapters: [...added, chapter] });
  return chapter;
}

/** One turn with the Guide. Its proposals come back for the owner to confirm; nothing is decided here. */
export async function talkToGuide(userId: string, phase: "intake" | "direction", text: string) {
  const message = text.trim();
  if (!message || message.length > 4000) throw new LabInputError("Write a message of up to 4000 characters.");
  if (phase === "direction" && !(await completedBaseline(userId))) throw new LabInputError("The direction talk comes after your baseline.", 409);
  await assertBudget(userId);
  const profile = await getProfileRow(userId);
  const history = profile?.conversation ?? [];
  const owner: GuideMessage = { role: "owner", text: message, at: new Date().toISOString() };
  const view = phase === "direction" ? await getProfileView(userId) : null;
  const reply = await guideTurn({
    phase,
    messages: [...history, owner],
    intake: profile?.intake ?? null,
    roles: careers.roles.map((role) => ({ id: role.id, title: role.title, summary: role.summary })),
    chapters: [...topicMap.modules.map((module) => ({ id: module.id, title: module.title, area: module.area })), ...(profile?.addedChapters ?? []).map((chapter) => ({ id: chapter.id, title: chapter.title, area: chapter.area }))],
    shape: view ? { areas: view.areas.map((area) => ({ area: area.area, level: area.now.level, estimate: area.now.estimate })), roles: view.roles.map((role) => ({ id: role.roleId, title: role.title, overall: role.overall, chaptersAway: role.missing.length })) } : undefined,
  });
  const guide: GuideMessage = { role: "guide", text: reply.reply, at: new Date().toISOString() };
  await upsertProfile(userId, { conversation: [...history, owner, guide].slice(-60) });
  return { reply: reply.reply, intake: reply.intake, direction: reply.direction, addChapters: reply.addChapters };
}

// ---- The profile view ----

function toRecord(row: typeof labAttempts.$inferSelect): AttemptRecord {
  return {
    id: row.id, topicId: row.topicId, kind: row.kind, mode: row.mode, label: row.label, gradedBy: row.gradedBy, voided: row.voided,
    selfRating: row.selfRating, misconceptions: row.misconceptions, solutionSeen: row.solutionSeen, assessmentId: row.assessmentId, createdAt: row.createdAt,
  };
}

function addedAsModules(added: AddedChapter[]): ModuleInfo[] {
  return added.map((chapter) => ({ id: chapter.id, title: chapter.title, track: chapter.area === "ai" ? "ai" : "fullstack", area: chapter.area, planned: [] }));
}

/** Screening labels per chapter, from the newest answered set at or before a moment. */
function screensAt(rows: (typeof labChapterScreens.$inferSelect)[], at: Date | null): ChapterScreen[] {
  const answered = rows.filter((row) => row.answeredAt && row.label && (!at || row.answeredAt <= at));
  const byChapter = new Map<string, typeof answered>();
  for (const row of answered) byChapter.set(row.chapterId, [...(byChapter.get(row.chapterId) ?? []), row]);
  return [...byChapter].map(([chapterId, items]) => {
    const newest = items.reduce((latest, item) => item.answeredAt! > latest.answeredAt! ? item : latest).setId;
    return { chapterId, labels: items.filter((item) => item.setId === newest).map((item) => item.label as Label) };
  });
}

export interface AreaView {
  area: Area;
  title: string;
  summary: string;
  now: AreaLevel;
  atBaseline: AreaLevel | null;
  checkpoints: { on: string; level: AreaLevel }[];
}

export interface RoadmapChapter extends RoadmapStep {
  title: string;
  topics: { topicId: string; title: string; status: Status; known: boolean }[];
  planned: string[];
  added: boolean;
}

export interface ProfileView {
  careers: { status: string; approvedOn: string | null; note: string; definitions: { developer: string; engineer: string }; levels: typeof careers.levels; sources: typeof careers.sources };
  baseline: { state: "none" | "in_progress" | "done"; runId: string | null; completedAt: string | null };
  checkpoint: { inProgressRunId: string | null; done: { id: string; completedAt: string }[] };
  intake: IntakeAnswers | null;
  direction: string | null;
  areas: AreaView[];
  /** How deep each chapter goes now, for the level table. */
  chapterStates: ChapterState[];
  roles: (RoleDistance & { title: string; summary: string })[];
  roadmap: RoadmapChapter[];
  pace: { weeklyHours: number; source: "hours" | "history"; hoursPerTopic: number | null };
  addedChapters: (AddedChapter & { screened: boolean; depth: string; next: { id: string; itemIndex: number; item: PublicItem } | null; started: boolean })[];
  conversation: GuideMessage[];
  radar: { week: string; checked: boolean; items: { id: string; tag: string; title: string; reason: string; sourceUrl: string | null; topicId: string | null; area: string }[] };
}

export async function getProfileView(userId: string): Promise<ProfileView> {
  const [profile, rows, lessonRows, screenRows, runs, radarRows, ownScreens] = await Promise.all([
    getProfileRow(userId),
    db().select().from(labAttempts).where(eq(labAttempts.userId, userId)),
    db().selectDistinct({ topicId: labLessons.topicId }).from(labLessons).where(eq(labLessons.userId, userId)),
    db().select().from(labChapterScreens).where(and(eq(labChapterScreens.userId, userId), isNotNull(labChapterScreens.answeredAt))),
    db().select().from(labAssessmentRuns).where(eq(labAssessmentRuns.userId, userId)).orderBy(desc(labAssessmentRuns.startedAt)),
    db().select().from(labRadarItems).where(and(eq(labRadarItems.userId, userId), isNull(labRadarItems.dismissedAt))).orderBy(desc(labRadarItems.createdAt)).limit(20),
    db().select().from(labChapterScreens).where(and(eq(labChapterScreens.userId, userId), isNull(labChapterScreens.runId))),
  ]);
  const baselineRun = runs.find((run) => run.kind === "baseline") ?? null;
  const baselineDone = baselineRun?.completedAt ?? null;
  const records = rows.map(toRecord);
  const legacy = baselineDone ? [] : baselineAttempts();
  const started = new Set(lessonRows.map((row) => row.topicId));
  const added = profile?.addedChapters ?? [];
  const extra = addedAsModules(added);

  const progressAt = (at: Date | null): TopicProgress[] => {
    const attempts = [...legacy, ...records.filter((attempt) => !at || attempt.createdAt <= at)];
    return topicMap.topics.map((topic) => computeProgress(topic, attempts, started.has(topic.id)).progress);
  };
  const statesAt = (at: Date | null) => chapterStates(topicMap, progressAt(at), screensAt(screenRows, at), extra);

  const progress = progressAt(null);
  const now = statesAt(null);
  const atBaseline = baselineDone ? statesAt(baselineDone) : null;
  const checkpointRuns = runs.filter((run) => run.kind === "checkpoint" && run.completedAt).reverse();
  const checkpointStates = checkpointRuns.map((run) => ({ on: run.completedAt!.toISOString(), states: statesAt(run.completedAt) }));

  const areas: AreaView[] = careers.areas.map((ladder) => ({
    area: ladder.id, title: ladder.title, summary: ladder.summary,
    now: areaLevel(ladder, now),
    atBaseline: atBaseline ? areaLevel(ladder, atBaseline) : null,
    checkpoints: checkpointStates.map((item) => ({ on: item.on, level: areaLevel(ladder, item.states) })),
  }));
  const roles = careers.roles.map((role) => ({ ...roleDistance(role, careers, now), title: role.title, summary: role.summary }));

  const weeklyHours = profile?.intake?.weeklyHours ?? 5;
  const spans = progress.filter((item) => item.validatedAt).map((item) => {
    const first = records.filter((attempt) => attempt.topicId === item.topicId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
    return first ? { firstAt: first.createdAt.toISOString(), provenAt: item.validatedAt! } : null;
  }).filter((item): item is { firstAt: string; provenAt: string } => item !== null);
  const hoursPerTopic = measuredHoursPerTopic(spans, weeklyHours);

  const chosen = careers.roles.find((role) => role.id === profile?.direction);
  const steps = chosen ? roadmap(chosen, careers, now, topicMap, progress, weeklyHours, hoursPerTopic ?? undefined) : [];
  const byTopic = new Map(progress.map((item) => [item.topicId, item]));
  const roadmapChapters: RoadmapChapter[] = steps.map((step) => {
    const module = topicMap.modules.find((item) => item.id === step.chapter);
    const own = added.find((item) => item.id === step.chapter);
    return {
      ...step,
      title: module?.title ?? own?.title ?? step.chapter,
      topics: topicMap.topics.filter((topic) => topic.module === step.chapter).map((topic) => {
        const item = byTopic.get(topic.id)!;
        return { topicId: topic.id, title: topic.title, status: item.status, known: item.status === "VALIDATED" || item.placement === "passed" };
      }),
      planned: module?.planned ?? [],
      added: Boolean(own),
    };
  });

  const week = isoWeek(new Date());
  const open = runs.find((run) => !run.completedAt);
  return {
    careers: { status: careers.status, approvedOn: careers.approvedOn, note: careers.note, definitions: careers.definitions, levels: careers.levels, sources: careers.sources },
    baseline: { state: baselineDone ? "done" : baselineRun ? "in_progress" : "none", runId: baselineRun?.id ?? null, completedAt: baselineDone?.toISOString() ?? null },
    checkpoint: { inProgressRunId: open?.kind === "checkpoint" ? open.id : null, done: checkpointRuns.map((run) => ({ id: run.id, completedAt: run.completedAt!.toISOString() })) },
    intake: profile?.intake ?? null,
    direction: profile?.direction ?? null,
    areas,
    chapterStates: now,
    roles,
    roadmap: roadmapChapters,
    pace: { weeklyHours, source: hoursPerTopic ? "history" : "hours", hoursPerTopic },
    addedChapters: added.map((chapter) => {
      const own = ownScreens.filter((row) => row.chapterId === chapter.id);
      const index = nextScreenQuestion(own.filter((row) => row.answeredAt).map((row) => row.itemIndex));
      const pending = own.find((row) => row.itemIndex === index);
      return {
        ...chapter,
        screened: own.length > 0 && index === null,
        started: own.length > 0,
        depth: now.find((state) => state.chapterId === chapter.id)?.depth ?? "none",
        next: pending ? { id: pending.id, itemIndex: pending.itemIndex, item: toPublicItem(pending.item) } : null,
      };
    }),
    conversation: profile?.conversation ?? [],
    radar: {
      week,
      checked: profile?.radarCheckedWeek === week,
      items: radarRows.filter((row) => row.week === week || row.tag === "recheck").map((row) => ({
        id: row.id, tag: row.tag, title: row.tag === "recheck" && row.topicId ? `Re-check ${findTopic(row.topicId)?.title ?? row.topicId}` : row.title,
        reason: row.reason, sourceUrl: row.sourceUrl, topicId: row.topicId, area: row.area,
      })),
    },
  };
}

/** Whether a run is open, for pages that need to stay closed-book. */
export async function runInProgress(userId: string) {
  return Boolean(await activeRun(userId));
}

export async function dismissRadarItem(userId: string, id: string) {
  const updated = await db().update(labRadarItems).set({ dismissedAt: new Date() })
    .where(and(eq(labRadarItems.id, id), eq(labRadarItems.userId, userId))).returning({ id: labRadarItems.id });
  if (!updated.length) throw new LabInputError("Radar item not found. Reload the page", 404);
  return { dismissed: true };
}

export async function screenRowsFor(userId: string, chapterIds: string[]) {
  if (!chapterIds.length) return [];
  return db().select().from(labChapterScreens).where(and(eq(labChapterScreens.userId, userId), inArray(labChapterScreens.chapterId, chapterIds)));
}

/** The Ken OS home's one-line card: direction and level, and whether today's practice is done. */
export async function labSummary(userId: string): Promise<{ headline: string; detail: string } | null> {
  const view = await getProfileView(userId);
  if (view.baseline.state !== "done") return { headline: view.baseline.state === "none" ? "Take your baseline to start your profile" : "Your baseline is in progress", detail: "Open the lab" };
  const chosen = view.roles.find((role) => role.roleId === view.direction);
  const { getDailySet } = await import("./daily");
  const daily = await getDailySet(userId);
  const level = chosen?.overall ? { junior: "junior", mid: "mid-level", senior: "senior" }[chosen.overall] : "not yet junior";
  return {
    headline: chosen ? `${chosen.title}: ${level}` : "Pick a direction for your profile",
    detail: daily?.done ? "Today's practice is done" : daily ? "Today's practice is waiting" : "Today's practice not started",
  };
}
