import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import type { PortfolioSnapshot } from "@ken-os/portfolio";
import { normalizeProfile } from "@ken-os/domain";
import { db } from "@/lib/db";
import { portfolioPublications, portfolios, profiles, users } from "@/lib/schema";
import { buildSnapshot } from "./snapshot";

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
}

export async function getPortfolio(userId: string): Promise<PortfolioState> {
  const [[state], [latest], [profile], [settings]] = await Promise.all([
    db()
      .select({ version: portfolioPublications.version, publishedAt: portfolioPublications.publishedAt })
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
    db().select({ updatedAt: profiles.updatedAt }).from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db().select({ showEmail: portfolios.showEmail }).from(portfolios).where(eq(portfolios.userId, userId)).limit(1),
  ]);
  const shape = (row?: { version: number; publishedAt: Date }) =>
    row ? { version: row.version, publishedAt: row.publishedAt.toISOString() } : null;
  return {
    live: shape(state),
    latest: shape(latest),
    profileSavedAt: profile?.updatedAt.toISOString() ?? null,
    showEmail: settings?.showEmail ?? false,
  };
}

/** Snapshots the saved Profile as the next publication and makes it live, in one transaction. */
export async function publishPortfolio(userId: string): Promise<PortfolioState> {
  const [profile] = await db().select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile) throw new PortfolioInputError("No details saved. Save Profile first", 409);
  const details = normalizeProfile(profile.details, "import");
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
      ),
      publishedAt: now,
    });
    await tx.update(portfolios).set({ currentPublicationId: id, updatedAt: now }).where(eq(portfolios.userId, userId));
  });
  return getPortfolio(userId);
}

/** Turns Show email on or off. Like every other choice, it goes live on the next Publish. */
export async function setShowEmail(userId: string, input: Record<string, unknown>): Promise<PortfolioState> {
  if (typeof input.showEmail !== "boolean") throw new PortfolioInputError("Choose on or off");
  const showEmail = input.showEmail;
  await db()
    .insert(portfolios)
    .values({ userId, showEmail })
    .onConflictDoUpdate({ target: portfolios.userId, set: { showEmail, updatedAt: new Date() } });
  return getPortfolio(userId);
}

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
