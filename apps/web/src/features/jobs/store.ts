import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobMatches, jobPostingSources, jobPostings } from "@/lib/schema";
import { filterReason } from "./filters";
import { getPreferences } from "./preferences-store";
import type { AlertSource, JobMatchState, RawPosting } from "./raw-posting";

/** Saves each posting, matching on the source's own ID when there is one, otherwise on title, company and location
 *  together (docs/product/job-finder.md, "Drop repeats"). A posting already seen from this exact source and ID is
 *  skipped; one already seen from a different source gets this source attached instead of a duplicate row. */
export async function savePostings(userId: string, postings: RawPosting[]): Promise<void> {
  const preferences = await getPreferences(userId);
  const now = new Date();
  for (const posting of postings) {
    await db().transaction(async (tx) => {
      if (posting.sourceId) {
        const [existingSource] = await tx
          .select({ postingId: jobPostingSources.postingId })
          .from(jobPostingSources)
          .where(and(eq(jobPostingSources.source, posting.source), eq(jobPostingSources.sourceId, posting.sourceId)))
          .limit(1);
        if (existingSource) return;
      }

      let postingId: string;
      const [existingPosting] = await tx
        .select({ id: jobPostings.id })
        .from(jobPostings)
        .where(
          and(
            eq(jobPostings.userId, userId),
            eq(jobPostings.title, posting.title),
            eq(jobPostings.company, posting.company),
            eq(jobPostings.location, posting.location),
          ),
        )
        .limit(1);

      if (existingPosting) {
        postingId = existingPosting.id;
      } else {
        postingId = randomUUID();
        await tx.insert(jobPostings).values({
          id: postingId,
          userId,
          title: posting.title,
          company: posting.company,
          location: posting.location,
          snippet: posting.snippet,
          firstSeenAt: now,
        });
        const reason = filterReason(
          { title: posting.title, company: posting.company, firstSeenAt: now },
          preferences,
          now,
        );
        await tx
          .insert(jobMatches)
          .values({ postingId, userId, state: reason ? "filtered_out" : "new", filterReason: reason });
      }

      await tx.insert(jobPostingSources).values({
        id: randomUUID(),
        postingId,
        source: posting.source,
        sourceId: posting.sourceId,
        link: posting.link,
      });
    });
  }
}

export type PostingView = {
  id: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  firstSeenAt: Date;
  state: JobMatchState;
  filterReason: string | null;
  sources: { source: AlertSource; link: string }[];
};

export async function listPostings(userId: string, state: JobMatchState): Promise<PostingView[]> {
  const rows = await db()
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      location: jobPostings.location,
      snippet: jobPostings.snippet,
      firstSeenAt: jobPostings.firstSeenAt,
      state: jobMatches.state,
      filterReason: jobMatches.filterReason,
    })
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(and(eq(jobPostings.userId, userId), eq(jobMatches.state, state)))
    .orderBy(desc(jobPostings.firstSeenAt));

  const postingIds = rows.map((row) => row.id);
  const sources = postingIds.length
    ? await db()
        .select({
          postingId: jobPostingSources.postingId,
          source: jobPostingSources.source,
          link: jobPostingSources.link,
        })
        .from(jobPostingSources)
        .where(inArray(jobPostingSources.postingId, postingIds))
    : [];
  const sourcesByPosting = new Map<string, { source: AlertSource; link: string }[]>();
  for (const row of sources) {
    const list = sourcesByPosting.get(row.postingId) ?? [];
    list.push({ source: row.source as AlertSource, link: row.link });
    sourcesByPosting.set(row.postingId, list);
  }

  return rows.map((row) => ({ ...row, sources: sourcesByPosting.get(row.id) ?? [] }));
}

/** Re-evaluates every stored posting against the current preferences (docs/product/job-finder.md: "Changing a
 *  setting refilters existing postings without a new alert"). Only touches a match's state and reason when the
 *  verdict actually changed. */
export async function refilterExisting(userId: string): Promise<void> {
  const preferences = await getPreferences(userId);
  const rows = await db()
    .select({
      postingId: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      firstSeenAt: jobPostings.firstSeenAt,
      state: jobMatches.state,
      filterReason: jobMatches.filterReason,
    })
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(eq(jobPostings.userId, userId));

  const now = new Date();
  for (const row of rows) {
    const reason = filterReason(row, preferences, now);
    const nextState: JobMatchState = reason ? "filtered_out" : "new";
    if (nextState === row.state && reason === row.filterReason) continue;
    await db()
      .update(jobMatches)
      .set({ state: nextState, filterReason: reason, updatedAt: now })
      .where(eq(jobMatches.postingId, row.postingId));
  }
}

/** Show anyway: moves a Filtered out posting back to New (docs/product/job-finder.md). Scoped to the owner's own
 *  posting, so one user can't move another's match. */
export async function showAnyway(userId: string, postingId: string): Promise<void> {
  await db()
    .update(jobMatches)
    .set({ state: "new", filterReason: null, updatedAt: new Date() })
    .where(and(eq(jobMatches.postingId, postingId), eq(jobMatches.userId, userId)));
}
