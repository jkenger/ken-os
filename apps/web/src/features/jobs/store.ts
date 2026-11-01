import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { jobMatches, jobPostingSources, jobPostings } from "@/lib/schema";
import { getProfile } from "@/features/profile/store";
import { getCachedRates } from "./currency-rates-store";
import { filterReason } from "./filters";
import { getPreferences } from "./preferences-store";
import type { AlertSource, JobMatchState, RawPosting } from "./raw-posting";
import { targetCountryFrom } from "./target-country";

/** The two pieces of filtering context that don't live in job_preferences: the owner's own country (from
 *  Profile) and the last cached currency snapshot. Fetched once per batch operation, not per posting. */
async function filterContext(
  userId: string,
): Promise<{ targetCountry: string; currencyRates: Record<string, number> }> {
  const [profile, currencyRates] = await Promise.all([getProfile(userId), getCachedRates()]);
  return { targetCountry: targetCountryFrom(profile.details.contact.country), currencyRates };
}

/** Saves each posting, matching on the source's own ID when there is one, otherwise on title, company and location
 *  together (docs/product/job-finder.md, "Drop repeats"). A posting already seen from this exact source and ID is
 *  skipped; one already seen from a different source gets this source attached instead of a duplicate row. */
export async function savePostings(userId: string, postings: RawPosting[]): Promise<void> {
  const preferences = await getPreferences(userId);
  const context = await filterContext(userId);
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
          sourceCountries: posting.sourceCountries ?? [],
          sourceWorkMode: posting.sourceWorkMode ?? null,
          sourceEmploymentType: posting.sourceEmploymentType ?? null,
          sourceSalaryMin: posting.sourceSalaryMin ?? null,
          sourceSalaryMax: posting.sourceSalaryMax ?? null,
          sourceSalaryCurrency: posting.sourceSalaryCurrency ?? null,
          sourceSalaryPeriod: posting.sourceSalaryPeriod ?? null,
          sourceExperienceYearsMin: posting.sourceExperienceYearsMin ?? null,
          firstSeenAt: now,
        });
        const reason = filterReason(
          { title: posting.title, company: posting.company, firstSeenAt: now },
          preferences,
          now,
          context,
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
  processedAt: Date | null;
  fullDescription: string | null;
  partial: boolean;
  summary: string | null;
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  workSetup: "remote" | "hybrid" | "on_site" | null;
  countries: string[] | null;
  shift: string | null;
  score: number | null;
  whyFits: { reason: string; citation: string }[];
  whatsMissing: string[];
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
      processedAt: jobPostings.processedAt,
      fullDescription: jobPostings.fullDescription,
      partial: jobPostings.partial,
      summary: jobPostings.summary,
      payAmount: jobPostings.payAmount,
      payCurrency: jobPostings.payCurrency,
      payPeriod: jobPostings.payPeriod,
      jobType: jobPostings.jobType,
      workSetup: jobPostings.workSetup,
      countries: jobPostings.countries,
      shift: jobMatches.shift,
      score: jobMatches.score,
      scoreReasons: jobMatches.scoreReasons,
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

  return rows.map((row) => {
    const { scoreReasons, ...rest } = row;
    return {
      ...rest,
      sources: sourcesByPosting.get(row.id) ?? [],
      whyFits: scoreReasons?.whyFits ?? [],
      whatsMissing: scoreReasons?.whatsMissing ?? [],
    };
  });
}

/** Re-evaluates every stored posting against the current preferences (docs/product/job-finder.md: "Changing a
 *  setting refilters existing postings without a new alert"). Only touches a match's state and reason when the
 *  verdict actually changed. A not-yet-processed posting's extracted-field columns are all null, so `filterReason`
 *  only applies the step-1 checks to it, same as it always has. */
export async function refilterExisting(userId: string): Promise<void> {
  const preferences = await getPreferences(userId);
  const context = await filterContext(userId);
  const rows = await db()
    .select({
      postingId: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      firstSeenAt: jobPostings.firstSeenAt,
      payAmount: jobPostings.payAmount,
      payCurrency: jobPostings.payCurrency,
      payPeriod: jobPostings.payPeriod,
      jobType: jobPostings.jobType,
      workSetup: jobPostings.workSetup,
      eligibilityStated: jobPostings.eligibilityStated,
      countries: jobPostings.countries,
      isAgency: jobPostings.isAgency,
      state: jobMatches.state,
      filterReason: jobMatches.filterReason,
    })
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(eq(jobPostings.userId, userId));

  const now = new Date();
  for (const row of rows) {
    const reason = filterReason(row, preferences, now, context);
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

export type PendingPosting = {
  id: string;
  title: string;
  company: string;
  location: string;
  snippet: string;
  sourceCountries: string[] | null;
  sourceWorkMode: "remote" | "hybrid" | "onsite" | null;
  sourceEmploymentType: string | null;
  sourceSalaryMin: number | null;
  sourceSalaryMax: number | null;
  sourceSalaryCurrency: string | null;
  sourceSalaryPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  sourceExperienceYearsMin: number | null;
};

/** Up to `limit` postings not yet processed by `/api/jobs/process`, oldest first (plans/jobs-score.md, Slice 1). */
export async function getPendingPostings(userId: string, limit: number): Promise<PendingPosting[]> {
  return db()
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      location: jobPostings.location,
      snippet: jobPostings.snippet,
      sourceSalaryMin: jobPostings.sourceSalaryMin,
      sourceSalaryMax: jobPostings.sourceSalaryMax,
      sourceSalaryCurrency: jobPostings.sourceSalaryCurrency,
      sourceSalaryPeriod: jobPostings.sourceSalaryPeriod,
      sourceExperienceYearsMin: jobPostings.sourceExperienceYearsMin,
      sourceCountries: jobPostings.sourceCountries,
      sourceWorkMode: jobPostings.sourceWorkMode,
      sourceEmploymentType: jobPostings.sourceEmploymentType,
    })
    .from(jobPostings)
    .where(and(eq(jobPostings.userId, userId), isNull(jobPostings.processedAt)))
    .orderBy(asc(jobPostings.firstSeenAt))
    .limit(limit);
}

export type ExtractedFields = {
  fullDescription: string | null;
  partial: boolean;
  summary: string;
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  workSetup: "remote" | "hybrid" | "on_site" | null;
  eligibilityStated: boolean;
  countries: string[];
  /** The formatted display string from `shift.ts` ("Mid shift, 5 PM to 1 AM", "Not listed", "Flexible") -- lives
   *  on `job_matches`, not `job_postings`, since it's shown next to score, not stored as a structured extraction
   *  field (plans/jobs-score.md, Slice 4). */
  shift: string;
  seniority: "junior" | "mid" | "senior" | "lead" | null;
  yearsRequired: number | null;
  isAgency: boolean;
  extractPromptVersion: string;
  extractModel: string;
};

/** Saves one posting's extracted fields, marks it processed, and applies the upgraded strict filters now that
 *  those fields exist (plans/jobs-score.md, Slice 2: Minimum pay, Job type, Work setup, Countries, Agencies). */
export async function saveExtractedFields(postingId: string, fields: ExtractedFields): Promise<void> {
  const now = new Date();
  const { shift, ...postingFields } = fields;
  await db()
    .update(jobPostings)
    .set({ ...postingFields, processedAt: now })
    .where(eq(jobPostings.id, postingId));

  const [row] = await db()
    .select({
      userId: jobMatches.userId,
      title: jobPostings.title,
      company: jobPostings.company,
      firstSeenAt: jobPostings.firstSeenAt,
    })
    .from(jobMatches)
    .innerJoin(jobPostings, eq(jobPostings.id, jobMatches.postingId))
    .where(eq(jobMatches.postingId, postingId))
    .limit(1);
  if (!row) return;

  const preferences = await getPreferences(row.userId);
  const context = await filterContext(row.userId);
  const reason = filterReason(
    {
      title: row.title,
      company: row.company,
      firstSeenAt: row.firstSeenAt,
      payAmount: fields.payAmount,
      payCurrency: fields.payCurrency,
      payPeriod: fields.payPeriod,
      jobType: fields.jobType,
      workSetup: fields.workSetup,
      eligibilityStated: fields.eligibilityStated,
      countries: fields.countries,
      isAgency: fields.isAgency,
    },
    preferences,
    now,
    context,
  );
  await db()
    .update(jobMatches)
    .set({ state: reason ? "filtered_out" : "new", filterReason: reason, shift, updatedAt: now })
    .where(eq(jobMatches.postingId, postingId));
}

export type ScorablePosting = {
  id: string;
  title: string;
  company: string;
  fullDescription: string | null;
  summary: string;
};

/** Postings needing a score: never scored, or scored against a Profile version that no longer matches the
 *  current one (plans/jobs-score.md, Slice 3). Only a posting that passed filtering (state "new") and has been
 *  extracted (`processedAt` set) is eligible; a filtered-out posting is never scored. `score IS NULL` catches
 *  "never scored" on its own, since `profileVersion` and a never-scored `profileVersionScored` are both null for
 *  the never-saved Profile — without it, `is distinct from` would treat those two nulls as equal and skip a
 *  posting that has never actually been scored. */
export async function getNeedingScore(
  userId: string,
  profileVersion: Date | null,
  limit: number,
): Promise<ScorablePosting[]> {
  const rows = await db()
    .select({
      id: jobPostings.id,
      title: jobPostings.title,
      company: jobPostings.company,
      fullDescription: jobPostings.fullDescription,
      summary: jobPostings.summary,
    })
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(
      and(
        eq(jobPostings.userId, userId),
        eq(jobMatches.state, "new"),
        isNotNull(jobPostings.processedAt),
        sql`(${jobMatches.score} is null or ${jobMatches.profileVersionScored} is distinct from ${profileVersion ? profileVersion.toISOString() : null}::timestamptz)`,
      ),
    )
    .orderBy(asc(jobPostings.firstSeenAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, summary: row.summary ?? "" }));
}

export type ScoreFields = {
  score: number;
  whyFits: { reason: string; citation: string }[];
  whatsMissing: string[];
  scorePromptVersion: string;
  profileVersionScored: Date | null;
};

export async function saveScore(postingId: string, fields: ScoreFields): Promise<void> {
  await db()
    .update(jobMatches)
    .set({
      score: fields.score,
      scoreReasons: { whyFits: fields.whyFits, whatsMissing: fields.whatsMissing },
      scorePromptVersion: fields.scorePromptVersion,
      profileVersionScored: fields.profileVersionScored,
      updatedAt: new Date(),
    })
    .where(eq(jobMatches.postingId, postingId));
}
