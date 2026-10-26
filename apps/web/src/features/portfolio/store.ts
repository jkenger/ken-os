import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import type { PortfolioEngineering, PortfolioSnapshot } from "@ken-os/portfolio";
import { normalizeProfile } from "@ken-os/domain";
import { getRoadmaps, type RoadmapView } from "@/features/engineering-lab/roadmap-store";
import type { ReviewSheet } from "@/features/engineering-lab/review-sheet";
import { db } from "@/lib/db";
import { labReviews, labTopicEvents, portfolioPublications, portfolios, profiles, users } from "@/lib/schema";
import { buildSnapshot, portfolioEngineering } from "./snapshot";

// Portfolio: one Publish turns the saved Profile into a public snapshot. Spec: docs/architecture/portfolio.md.

export class PortfolioInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export interface PortfolioState {
  /** The live publication, or null when unpublished. */
  live: { version: number; publishedAt: string } | null;
  /** The newest publication, live or not, for "Last published". */
  latest: { version: number; publishedAt: string } | null;
  /** When the Profile was last saved; Publish needs saved details. */
  profileSavedAt: string | null;
  /** Whether the next Publish includes the Profile email. */
  showEmail: boolean;
  /** Whether the next Publish would change what visitors see: Profile edits, a switch, the resume template, or progress
   *  on a shown roadmap. */
  unpublishedChanges: boolean;
  /** Whether the Profile or the resume template changed since the live publication; part of `unpublishedChanges`. */
  profileChanged: boolean;
  /** The resume template and paper the next Publish prints with. */
  resume: { template: string; paper: string } | null;
  /** The saved Profile's name and email, for the heading and the Email row. */
  contact: { name: string; email: string } | null;
  engineering: {
    /** Active roadmaps, opened last first, and whether each is shown on the site. */
    roadmaps: { id: string; goal: string; learned: number; total: number; shown: boolean }[];
    /** Learned topics on the shown roadmaps, newest first, with the owner's saved explanation if there is one. */
    learned: { topicId: string; title: string; learnedAt: string | null; explanation: string | null; shown: boolean }[];
  };
}

interface Settings {
  showEmail: boolean;
  shownRoadmaps: string[] | null;
  shownExplanations: string[];
}

/** The owner's saved roadmaps, the ones shown on the site, and the reviews and explanations their topics have. */
async function engineeringSource(userId: string, settings: Settings) {
  // Without a saved roadmap, getRoadmaps returns the target role's path (id null): nothing to publish yet.
  const roadmaps = (await getRoadmaps(userId)).filter((roadmap): roadmap is RoadmapView & { id: string } =>
    Boolean(roadmap.id),
  );
  const shownIds = settings.shownRoadmaps ?? roadmaps.slice(0, 1).map((roadmap) => roadmap.id);
  const shown = roadmaps.filter((roadmap) => shownIds.includes(roadmap.id));
  const topics = shown.flatMap((roadmap) => roadmap.chapters.flatMap((chapter) => chapter.topics));
  const topicIds = [...new Set(topics.map((topic) => topic.id))];
  const [reviewRows, evidenceRows] = topicIds.length
    ? await Promise.all([
        db()
          .select({ topicId: labReviews.topicId, sheet: labReviews.sheet })
          .from(labReviews)
          .where(and(eq(labReviews.userId, userId), inArray(labReviews.topicId, topicIds)))
          .orderBy(desc(labReviews.version)),
        db()
          .select({ topicId: labTopicEvents.topicId, evidence: labTopicEvents.evidence })
          .from(labTopicEvents)
          .where(
            and(
              eq(labTopicEvents.userId, userId),
              inArray(labTopicEvents.topicId, topicIds),
              eq(labTopicEvents.kind, "report"),
              isNotNull(labTopicEvents.evidence),
            ),
          )
          .orderBy(desc(labTopicEvents.createdAt)),
      ])
    : [[], []];
  // Rows come newest first, so the first one per topic is the latest sheet and the latest Learned explanation.
  const reviews = new Map<string, ReviewSheet>();
  for (const row of reviewRows) if (!reviews.has(row.topicId)) reviews.set(row.topicId, row.sheet);
  const explanations = new Map<string, string>();
  for (const row of evidenceRows)
    if (row.evidence && !explanations.has(row.topicId)) explanations.set(row.topicId, row.evidence);
  const learned = [
    ...new Map(topics.filter((topic) => topic.status === "learned").map((t) => [t.id, t])).values(),
  ].sort((a, b) => (b.learnedAt ?? "").localeCompare(a.learnedAt ?? ""));
  return { roadmaps, shownIds, shown, reviews, explanations, learned };
}

function publishedEngineering(
  source: Awaited<ReturnType<typeof engineeringSource>>,
  settings: Settings,
): PortfolioEngineering {
  // Only Learned topics have a switch on the page, so a topic set back from Learned publishes no explanation.
  const learnedIds = new Set(source.learned.map((topic) => topic.id));
  const switchedOn = new Map(
    [...source.explanations].filter(
      ([topicId]) => learnedIds.has(topicId) && settings.shownExplanations.includes(topicId),
    ),
  );
  return portfolioEngineering({ roadmaps: source.shown, reviews: source.reviews, explanations: switchedOn });
}

async function readSettings(userId: string): Promise<Settings & { updatedAt: Date | null }> {
  const [row] = await db()
    .select({
      showEmail: portfolios.showEmail,
      shownRoadmaps: portfolios.shownRoadmaps,
      shownExplanations: portfolios.shownExplanations,
      updatedAt: portfolios.updatedAt,
    })
    .from(portfolios)
    .where(eq(portfolios.userId, userId))
    .limit(1);
  return row ?? { showEmail: false, shownRoadmaps: null, shownExplanations: [], updatedAt: null };
}

export async function getPortfolio(userId: string): Promise<PortfolioState> {
  const [[state], [latest], [profile], settings] = await Promise.all([
    db()
      .select({
        version: portfolioPublications.version,
        publishedAt: portfolioPublications.publishedAt,
        resume: sql<PortfolioSnapshot["resume"] | null>`${portfolioPublications.snapshot}->'resume'`,
        engineering: sql<PortfolioSnapshot["engineering"] | null>`${portfolioPublications.snapshot}->'engineering'`,
      })
      .from(portfolios)
      .innerJoin(portfolioPublications, eq(portfolioPublications.id, portfolios.currentPublicationId))
      .where(eq(portfolios.userId, userId))
      .limit(1),
    db()
      .select({ version: portfolioPublications.version, publishedAt: portfolioPublications.publishedAt })
      .from(portfolioPublications)
      .where(eq(portfolioPublications.userId, userId))
      .orderBy(desc(portfolioPublications.version))
      .limit(1),
    db()
      .select({
        updatedAt: profiles.updatedAt,
        template: profiles.template,
        paper: profiles.paper,
        details: profiles.details,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1),
    readSettings(userId),
  ]);
  const source = await engineeringSource(userId, settings);
  // Publish stamps `portfolios.updated_at` with the publication time, so a later stamp means a switch changed since.
  // Engineering is compared whole, so a topic learned after the publish counts too.
  const published = state?.resume ?? { template: "classic", paper: "letter" };
  const profileChanged = Boolean(
    state &&
    profile &&
    (profile.updatedAt > state.publishedAt ||
      profile.template !== published.template ||
      profile.paper !== published.paper),
  );
  const unpublishedChanges = Boolean(
    state &&
    profile &&
    (profileChanged ||
      (settings.updatedAt && settings.updatedAt > state.publishedAt) ||
      canonical(state.engineering ?? { roadmaps: [] }) !== canonical(publishedEngineering(source, settings))),
  );
  const shape = (row?: { version: number; publishedAt: Date }) =>
    row ? { version: row.version, publishedAt: row.publishedAt.toISOString() } : null;
  return {
    live: shape(state),
    latest: shape(latest),
    profileSavedAt: profile?.updatedAt.toISOString() ?? null,
    showEmail: settings.showEmail,
    unpublishedChanges,
    profileChanged,
    resume: profile ? { template: profile.template, paper: profile.paper } : null,
    contact: profile ? contactOf(profile.details) : null,
    engineering: {
      roadmaps: source.roadmaps.map((roadmap) => ({
        id: roadmap.id,
        goal: roadmap.goal?.title ?? "",
        learned: roadmap.counts.learned,
        total: roadmap.counts.total,
        shown: source.shownIds.includes(roadmap.id),
      })),
      learned: source.learned.map((topic) => ({
        topicId: topic.id,
        title: topic.title,
        learnedAt: topic.learnedAt,
        explanation: source.explanations.get(topic.id) ?? null,
        shown: settings.shownExplanations.includes(topic.id) && source.explanations.has(topic.id),
      })),
    },
  };
}

/** Snapshots the saved Profile as the next publication and makes it live, in one transaction. */
export async function publishPortfolio(userId: string): Promise<PortfolioState> {
  const [profile] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) throw new PortfolioInputError("No details saved. Save Profile first", 409);
  const details = normalizeProfile(profile.details, "import");
  const settings = await readSettings(userId);
  const engineering = publishedEngineering(await engineeringSource(userId, settings), settings);
  await db().transaction(async (tx) => {
    // Locks the owner's row so two Publish clicks can't pick the same version.
    await tx.insert(portfolios).values({ userId }).onConflictDoNothing();
    const [portfolio] = await tx.select().from(portfolios).where(eq(portfolios.userId, userId)).for("update");
    const [{ next }] = await tx
      .select({ next: sql<number>`coalesce(max(${portfolioPublications.version}), 0) + 1` })
      .from(portfolioPublications)
      .where(eq(portfolioPublications.userId, userId));
    const now = new Date();
    const id = randomUUID();
    await tx.insert(portfolioPublications).values({
      id,
      userId,
      version: Number(next),
      snapshot: buildSnapshot(
        details,
        { template: profile.template, paper: profile.paper },
        { showEmail: portfolio.showEmail },
        Number(next),
        now,
        engineering,
      ),
      publishedAt: now,
    });
    await tx.update(portfolios).set({ currentPublicationId: id, updatedAt: now }).where(eq(portfolios.userId, userId));
  });
  return getPortfolio(userId);
}

/** Saves one switch: Show email, Show on site for a roadmap, or Show explanation for a Learned topic. Like every other
 *  choice, it goes live on the next Publish. */
export async function updateSettings(userId: string, input: Record<string, unknown>): Promise<PortfolioState> {
  if (typeof input.shown !== "boolean" && typeof input.showEmail !== "boolean")
    throw new PortfolioInputError("Choose on or off");
  const on = input.shown === true;
  let change: (saved: Settings) => Partial<typeof portfolios.$inferInsert>;
  if (typeof input.showEmail === "boolean") {
    const showEmail = input.showEmail;
    change = () => ({ showEmail });
  } else if (typeof input.roadmapId === "string") {
    const roadmapId = input.roadmapId;
    const { roadmaps } = await engineeringSource(userId, await readSettings(userId));
    if (!roadmaps.some((roadmap) => roadmap.id === roadmapId))
      throw new PortfolioInputError("That roadmap isn't active", 404);
    // Nothing saved yet means the roadmap opened last is shown.
    change = (saved) => ({ shownRoadmaps: toggle(saved.shownRoadmaps ?? [roadmaps[0].id], roadmapId, on) });
  } else if (typeof input.topicId === "string") {
    const topicId = input.topicId;
    const { explanations } = await engineeringSource(userId, await readSettings(userId));
    if (on && !explanations.has(topicId)) throw new PortfolioInputError("No explanation saved", 409);
    change = (saved) => ({ shownExplanations: toggle(saved.shownExplanations, topicId, on) });
  } else throw new PortfolioInputError("Choose a switch");
  await db().transaction(async (tx) => {
    // Locks the owner's row so two switches flipped at once both keep their change to the same list.
    await tx.insert(portfolios).values({ userId }).onConflictDoNothing();
    const [saved] = await tx.select().from(portfolios).where(eq(portfolios.userId, userId)).for("update");
    await tx
      .update(portfolios)
      .set({ ...change(saved), updatedAt: new Date() })
      .where(eq(portfolios.userId, userId));
  });
  return getPortfolio(userId);
}

function contactOf(saved: unknown) {
  const { contact } = normalizeProfile(saved, "import");
  return { name: contact.fullName, email: contact.email };
}

/** JSON with object keys sorted, since Postgres jsonb doesn't keep the key order a snapshot was written in. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
}

const toggle = (ids: string[], id: string, on: boolean) =>
  on ? [...new Set([...ids, id])] : ids.filter((item) => item !== id);

/** Takes the portfolio offline. Past publications stay, private, so a later Publish continues the count. */
export async function unpublishPortfolio(userId: string): Promise<PortfolioState> {
  await db()
    .update(portfolios)
    .set({ currentPublicationId: null, updatedAt: new Date() })
    .where(eq(portfolios.userId, userId));
  return getPortfolio(userId);
}

/** The live snapshot of the given owner, for the public endpoint. Reads nothing else. */
export async function liveSnapshot(ownerEmail: string): Promise<PortfolioSnapshot | null> {
  const [row] = await db()
    .select({ snapshot: portfolioPublications.snapshot })
    .from(users)
    .innerJoin(portfolios, eq(portfolios.userId, users.id))
    .innerJoin(portfolioPublications, eq(portfolioPublications.id, portfolios.currentPublicationId))
    .where(sql`lower(${users.email}) = ${ownerEmail}`)
    .limit(1);
  return row?.snapshot ?? null;
}

/** The live snapshot of this owner, for Profile to tell which sections a Publish would change. Null when unpublished. */
export async function liveSnapshotFor(userId: string): Promise<PortfolioSnapshot | null> {
  const [row] = await db()
    .select({ snapshot: portfolioPublications.snapshot })
    .from(portfolios)
    .innerJoin(portfolioPublications, eq(portfolioPublications.id, portfolios.currentPublicationId))
    .where(eq(portfolios.userId, userId))
    .limit(1);
  return row?.snapshot ?? null;
}
