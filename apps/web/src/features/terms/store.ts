import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { explainTerm } from "@ken-os/agents";
import { finalizeTermAnswer, isTrustedSourceUrl, safeReturnPath, TERM_LOOKUP_LIMIT, TERM_MAX_LENGTH, termKey, type TermAnswer } from "@ken-os/domain";
import { db } from "@/lib/db";
import { kenTermLookups, kenTerms } from "@/lib/schema";

export class TermInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

export interface SavedTerm {
  id: string;
  term: string;
  meaning: string;
  source: { title: string; url: string } | null;
  foundIn: string;
  foundAt: string;
  savedAt: string;
}

function startOfToday() {
  return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
}

export async function lookupsToday(userId: string) {
  const [row] = await db().select({ n: sql<number>`count(*)::int` }).from(kenTermLookups).where(and(eq(kenTermLookups.userId, userId), gte(kenTermLookups.createdAt, startOfToday())));
  return row?.n ?? 0;
}

function fromRow(row: typeof kenTerms.$inferSelect): SavedTerm {
  return {
    id: row.id, term: row.term, meaning: row.meaning, foundIn: row.foundIn, foundAt: row.foundAt, savedAt: row.createdAt.toISOString(),
    source: row.sourceUrl ? { title: row.sourceTitle ?? row.sourceUrl, url: row.sourceUrl } : null,
  };
}

/** How long a looked-up answer is reused before the same term is looked up afresh. */
export const LOOKUP_REUSE_DAYS = 30;

async function isSaved(userId: string, key: string) {
  const [row] = await db().select({ id: kenTerms.id }).from(kenTerms).where(and(eq(kenTerms.userId, userId), eq(kenTerms.termKey, key))).limit(1);
  return Boolean(row);
}

/**
 * Explains a selected term. A saved term comes from Terms, and a term looked up in the last 30 days reuses that answer;
 * neither calls the AI or counts toward the daily limit. A fresh answer is stored as soon as it arrives, so it isn't
 * lost if the browser closed the popover or left the page while waiting.
 */
export async function lookupTerm(userId: string, input: { selection: string; context: string; place: string }): Promise<TermAnswer & { saved: boolean; reused: boolean }> {
  const selection = input.selection.trim();
  if (!selection || selection.length > TERM_MAX_LENGTH) throw new TermInputError(`Select a word or short phrase, up to ${TERM_MAX_LENGTH} characters.`);
  const key = termKey(selection);
  const [existing] = await db().select().from(kenTerms).where(and(eq(kenTerms.userId, userId), eq(kenTerms.termKey, key))).limit(1);
  if (existing) {
    const { term, meaning, source } = fromRow(existing);
    return { term, meaning, source, saved: true, reused: true };
  }
  const since = new Date(Date.now() - LOOKUP_REUSE_DAYS * 24 * 60 * 60 * 1000);
  const [recent] = await db().select({ answer: kenTermLookups.answer }).from(kenTermLookups)
    .where(and(eq(kenTermLookups.userId, userId), eq(kenTermLookups.termKey, key), gte(kenTermLookups.createdAt, since)))
    .orderBy(desc(kenTermLookups.createdAt)).limit(1);
  if (recent?.answer) return { ...recent.answer, saved: await isSaved(userId, termKey(recent.answer.term)), reused: true };

  if (await lookupsToday(userId) >= TERM_LOOKUP_LIMIT) throw new TermInputError(`Today's ${TERM_LOOKUP_LIMIT} lookups are used up. They reset at midnight UTC.`, 429);
  if (!process.env.OPENAI_API_KEY) throw new TermInputError("Term lookup is not configured yet.", 503);
  const { answer, model } = await explainTerm({ selection, context: input.context, place: input.place });
  await db().insert(kenTermLookups).values({ id: randomUUID(), userId, model, termKey: key, answer });
  return { ...answer, saved: await isSaved(userId, termKey(answer.term)), reused: false };
}

/** Saves a term. The browser sends back what the lookup showed; it is checked again here, so a forged link can't be stored. */
export async function saveTerm(userId: string, input: { term: string; meaning: string; sourceTitle: string | null; sourceUrl: string | null; foundIn: string; foundAt: string }) {
  const answer = finalizeTermAnswer(input.term, input);
  if (!answer.term || answer.meaning.length < 5) throw new TermInputError("A term needs a meaning to save.");
  const inserted = await db().insert(kenTerms).values({
    id: randomUUID(), userId, term: answer.term, termKey: termKey(answer.term), meaning: answer.meaning,
    sourceTitle: answer.source?.title ?? null, sourceUrl: answer.source && isTrustedSourceUrl(answer.source.url) ? answer.source.url : null,
    foundIn: input.foundIn.trim().slice(0, 160) || "Ken OS", foundAt: safeReturnPath(input.foundAt),
  }).onConflictDoNothing().returning({ id: kenTerms.id });
  return { id: inserted[0]?.id ?? null, alreadySaved: !inserted.length };
}

export async function listTerms(userId: string): Promise<SavedTerm[]> {
  const rows = await db().select().from(kenTerms).where(eq(kenTerms.userId, userId)).orderBy(desc(kenTerms.createdAt));
  return rows.map(fromRow);
}

export async function deleteTerm(userId: string, id: string) {
  const deleted = await db().delete(kenTerms).where(and(eq(kenTerms.userId, userId), eq(kenTerms.id, id))).returning({ id: kenTerms.id });
  if (!deleted.length) throw new TermInputError("Term not found.", 404);
}
