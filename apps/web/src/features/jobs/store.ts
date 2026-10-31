import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobInboundEmails, jobMatches, jobPostingSources, jobPostings } from "@/lib/schema";
import type { AlertSource } from "./known-senders";
import type { JobMatchState, RawPosting } from "./raw-posting";

export async function saveInboundEmail(params: {
  userId: string;
  fromAddress: string;
  source: AlertSource | null;
  rawHtml?: string;
  rawText?: string;
}): Promise<string> {
  const id = randomUUID();
  await db().insert(jobInboundEmails).values({
    id,
    userId: params.userId,
    fromAddress: params.fromAddress,
    source: params.source,
    rawHtml: params.rawHtml,
    rawText: params.rawText,
  });
  return id;
}

/** Saves each posting, matching on the source's own ID when there is one, otherwise on title, company and location
 *  together (docs/product/job-finder.md, "Drop repeats"). A posting already seen from this exact source and ID is
 *  skipped; one already seen from a different source gets this source attached instead of a duplicate row. */
export async function savePostings(userId: string, postings: RawPosting[]): Promise<void> {
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
        });
        await tx.insert(jobMatches).values({ postingId, userId, state: "new" });
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
