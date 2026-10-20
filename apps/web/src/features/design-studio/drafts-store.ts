import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { designStudioDrafts } from "@/lib/schema";
import { isEmptyDraft, type Draft } from "./drafts";

// The owner's Design Studio drafts in Postgres (docs/architecture/design-studio.md), so they survive a refresh and a
// change of device. One row per token or component; saving an empty change removes the row.

export async function listDrafts(userId: string): Promise<Draft[]> {
  const rows = await db()
    .select()
    .from(designStudioDrafts)
    .where(eq(designStudioDrafts.userId, userId))
    .orderBy(asc(designStudioDrafts.kind), asc(designStudioDrafts.target));
  return rows.map((row) => ({
    kind: row.kind,
    target: row.target,
    change: row.change,
    updatedAt: row.updatedAt.toISOString(),
  })) as Draft[];
}

/** Saves one checked draft, replacing the token's or component's earlier one. */
export async function saveDraft(userId: string, draft: Draft) {
  if (isEmptyDraft(draft)) return discardDraft(userId, draft);
  const now = new Date();
  await db()
    .insert(designStudioDrafts)
    .values({ userId, kind: draft.kind, target: draft.target, change: draft.change, updatedAt: now })
    .onConflictDoUpdate({
      target: [designStudioDrafts.userId, designStudioDrafts.kind, designStudioDrafts.target],
      set: { change: draft.change, updatedAt: now },
    });
  return listDrafts(userId);
}

export async function discardDraft(userId: string, draft: Pick<Draft, "kind" | "target">) {
  await db()
    .delete(designStudioDrafts)
    .where(
      and(
        eq(designStudioDrafts.userId, userId),
        eq(designStudioDrafts.kind, draft.kind),
        eq(designStudioDrafts.target, draft.target),
      ),
    );
  return listDrafts(userId);
}

export async function discardAllDrafts(userId: string) {
  await db().delete(designStudioDrafts).where(eq(designStudioDrafts.userId, userId));
  return [];
}
