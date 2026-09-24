import { randomUUID } from "node:crypto";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { skills } from "./schema";
import type { ParsedSkillBundle } from "./skill-bundle";

export interface StoredSkill {
  id: string;
  slug: string;
  name: string;
  description: string;
  version: number;
  files: Record<string, string>;
  enabled: boolean;
  createdAt: string;
}

export interface RuntimeSkill {
  slug: string;
  version: number;
  files: Record<string, string>;
}

export async function listSkills(userId: string): Promise<StoredSkill[]> {
  const rows = await db()
    .select()
    .from(skills)
    .where(eq(skills.userId, userId))
    .orderBy(skills.slug, desc(skills.version));
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    version: row.version,
    files: row.files,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getSkill(
  userId: string,
  id: string,
): Promise<StoredSkill | null> {
  const rows = await db()
    .select()
    .from(skills)
    .where(and(eq(skills.userId, userId), eq(skills.id, id)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    version: row.version,
    files: row.files,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function saveSkill(
  userId: string,
  bundle: ParsedSkillBundle,
): Promise<string> {
  return db().transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:${bundle.slug}`}))`,
    );
    const existing = await transaction
      .select({ id: skills.id })
      .from(skills)
      .where(
        and(
          eq(skills.userId, userId),
          eq(skills.slug, bundle.slug),
          eq(skills.digest, bundle.digest),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0].id;
    const latest = await transaction
      .select({ version: skills.version })
      .from(skills)
      .where(and(eq(skills.userId, userId), eq(skills.slug, bundle.slug)))
      .orderBy(desc(skills.version))
      .limit(1);
    const id = randomUUID();
    await transaction.insert(skills).values({
      id,
      userId,
      slug: bundle.slug,
      name: bundle.name,
      description: bundle.description,
      version: (latest[0]?.version ?? 0) + 1,
      files: bundle.files,
      digest: bundle.digest,
    });
    return id;
  });
}

export async function setSkillEnabled(
  userId: string,
  id: string,
  enabled: boolean,
): Promise<void> {
  await db().transaction(async (transaction) => {
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${userId}))`,
    );
    const selected = await transaction
      .select({ slug: skills.slug })
      .from(skills)
      .where(and(eq(skills.userId, userId), eq(skills.id, id)))
      .limit(1);
    if (!selected[0]) throw new Error("Skill version not found.");
    if (enabled) {
      const others = await transaction
        .select({ id: skills.id })
        .from(skills)
        .where(
          and(
            eq(skills.userId, userId),
            eq(skills.enabled, true),
            ne(skills.slug, selected[0].slug),
          ),
        );
      if (others.length >= 3)
        throw new Error(
          "Disable a skill before enabling more than three for the resume agent.",
        );
      await transaction
        .update(skills)
        .set({ enabled: false })
        .where(
          and(eq(skills.userId, userId), eq(skills.slug, selected[0].slug)),
        );
    }
    await transaction
      .update(skills)
      .set({ enabled })
      .where(and(eq(skills.userId, userId), eq(skills.id, id)));
  });
}

export async function getEnabledSkills(
  userId: string,
): Promise<RuntimeSkill[]> {
  return db()
    .select({ slug: skills.slug, version: skills.version, files: skills.files })
    .from(skills)
    .where(and(eq(skills.userId, userId), eq(skills.enabled, true)))
    .orderBy(skills.slug);
}
