import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, ne, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { jobMatches, jobPostingSources, jobPostings } from "@/lib/db/schema";
import { getCachedRates } from "./currency-rates-store";
import { filterReason } from "./filters";
import { getPreferences } from "./preferences-store";
import type { AlertSource, JobMatchState, RawPosting } from "./raw-posting";

/** The one piece of filtering context that doesn't live in job_preferences: the last cached currency snapshot.
 *  Fetched once per batch operation, not per posting. */
async function filterContext(): Promise<{ currencyRates: Record<string, number> }> {
  return { currencyRates: await getCachedRates() };
}

/** Saves each posting, matching on the source's own ID when there is one, otherwise on title, company and location
 *  together (docs/product/job-finder.md, "Drop repeats"). A posting already seen from this exact source and ID is
 *  skipped; one already seen from a different source gets this source attached instead of a duplicate row.
 *
 *  `fetchFullDescription` is optional, injected dependency for the freehire search endpoint's own truncated
 *  `description` (confirmed live: capped around 1000 characters, cut off mid-sentence, on every result) -- when
 *  given, it's called once per posting, only the first time that posting is genuinely new (a cheap pre-check
 *  outside the transaction decides that, re-verified by the transaction's own check before inserting), to fetch
 *  the complete text from freehire's one-job detail endpoint instead. Never called for a posting already saved,
 *  so this doesn't turn every poll's dozens of results into as many extra requests. */
export async function savePostings(
  userId: string,
  postings: RawPosting[],
  fetchFullDescription?: (sourceId: string) => Promise<string | null>,
): Promise<void> {
  const preferences = await getPreferences(userId);
  const context = await filterContext();
  const now = new Date();
  for (const posting of postings) {
    let descriptionHtml = posting.descriptionHtml ?? null;
    if (fetchFullDescription && posting.sourceId) {
      const [alreadySaved] = await db()
        .select({ postingId: jobPostingSources.postingId })
        .from(jobPostingSources)
        .where(and(eq(jobPostingSources.source, posting.source), eq(jobPostingSources.sourceId, posting.sourceId)))
        .limit(1);
      if (!alreadySaved) {
        const full = await fetchFullDescription(posting.sourceId);
        if (full) descriptionHtml = full;
      }
    }

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
          skills: posting.skills ?? [],
          sourcePostedAt: posting.postedAt ? new Date(posting.postedAt) : null,
          sourceUpdatedAt: posting.updatedAt ? new Date(posting.updatedAt) : null,
          descriptionHtml,
          originBoard: posting.originBoard ?? null,
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
  /** Null until the owner opens this posting's detail page once -- the card's New badge shows while it's null. */
  viewedAt: Date | null;
  /** Null until the owner clicks Save; cleared back to null by clicking Save again (ADR-003). */
  savedAt: Date | null;
  sources: { source: AlertSource; link: string }[];
  processedAt: Date | null;
  fullDescription: string | null;
  descriptionHtml: string | null;
  originBoard: string | null;
  partial: boolean;
  summary: string | null;
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  /** The source's own stated range, before `payAmount` averages it into one number -- the card shows this range
   *  directly when both are present, since "$2,000-$3,000" says more than the midpoint alone. */
  sourceSalaryMin: number | null;
  sourceSalaryMax: number | null;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  workSetup: "remote" | "hybrid" | "on_site" | null;
  countries: string[] | null;
  seniority: "junior" | "mid" | "senior" | "lead" | null;
  yearsRequired: number | null;
  shift: string | null;
  skills: string[];
  sourcePostedAt: Date | null;
  sourceUpdatedAt: Date | null;
  score: number | null;
  whyFits: { reason: string; citation: string }[];
  whatsMissing: string[];
};

const POSTING_COLUMNS = {
  id: jobPostings.id,
  title: jobPostings.title,
  company: jobPostings.company,
  location: jobPostings.location,
  snippet: jobPostings.snippet,
  firstSeenAt: jobPostings.firstSeenAt,
  state: jobMatches.state,
  filterReason: jobMatches.filterReason,
  viewedAt: jobMatches.viewedAt,
  savedAt: jobMatches.savedAt,
  processedAt: jobPostings.processedAt,
  fullDescription: jobPostings.fullDescription,
  descriptionHtml: jobPostings.descriptionHtml,
  originBoard: jobPostings.originBoard,
  partial: jobPostings.partial,
  summary: jobPostings.summary,
  payAmount: jobPostings.payAmount,
  payCurrency: jobPostings.payCurrency,
  payPeriod: jobPostings.payPeriod,
  sourceSalaryMin: jobPostings.sourceSalaryMin,
  sourceSalaryMax: jobPostings.sourceSalaryMax,
  jobType: jobPostings.jobType,
  workSetup: jobPostings.workSetup,
  countries: jobPostings.countries,
  seniority: jobPostings.seniority,
  yearsRequired: jobPostings.yearsRequired,
  shift: jobMatches.shift,
  skills: jobPostings.skills,
  sourcePostedAt: jobPostings.sourcePostedAt,
  sourceUpdatedAt: jobPostings.sourceUpdatedAt,
  score: jobMatches.score,
  scoreReasons: jobMatches.scoreReasons,
} as const;

type ScoreReasons = { whyFits: { reason: string; citation: string }[]; whatsMissing: string[] } | null;
type Attachment = Pick<PostingView, "sources" | "whyFits" | "whatsMissing">;
/** What a `POSTING_COLUMNS` query returns: every `PostingView` field it selects directly, plus the raw
 *  `scoreReasons` column that `toPostingView` flattens into `whyFits`/`whatsMissing`. */
type PostingRow = Omit<PostingView, "sources" | "whyFits" | "whatsMissing"> & { scoreReasons: ScoreReasons };

/** Attaches each row's sources and flattens its score reasons, the shared tail of both `listPostings` and
 *  `getPosting` once they've each run their own filtered query against `POSTING_COLUMNS`. */
async function attachSourcesAndScore(rows: PostingRow[]): Promise<Map<string, Attachment>> {
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

  const result = new Map<string, Attachment>();
  for (const row of rows) {
    result.set(row.id, {
      sources: sourcesByPosting.get(row.id) ?? [],
      whyFits: row.scoreReasons?.whyFits ?? [],
      whatsMissing: row.scoreReasons?.whatsMissing ?? [],
    });
  }
  return result;
}

function toPostingView(row: PostingRow, attachment: Attachment): PostingView {
  const { scoreReasons, ...rest } = row;
  return { ...rest, ...attachment };
}

/** Every distinct company name from the owner's own postings, for the Skip companies filter's search list --
 *  real companies that have actually shown up, not a speculative list (`MultiSelectCommand` in
 *  `filter-sidebar.tsx`). */
export async function getDistinctCompanies(userId: string): Promise<string[]> {
  const rows = await db()
    .selectDistinct({ company: jobPostings.company })
    .from(jobPostings)
    .where(eq(jobPostings.userId, userId))
    .orderBy(asc(jobPostings.company));
  return rows.map((row) => row.company);
}

/** How many postings the owner has in a given state -- the list header's stable total and the Overview's
 *  zero-state check, without fetching the postings themselves. */
export async function countPostings(userId: string, state: JobMatchState, board?: string): Promise<number> {
  const conditions = [eq(jobPostings.userId, userId), eq(jobMatches.state, state)];
  if (board) conditions.push(eq(jobPostings.originBoard, board));
  const [row] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(and(...conditions));
  return row?.n ?? 0;
}

export async function listPostings(userId: string, state: JobMatchState): Promise<PostingView[]> {
  const rows = await db()
    .select(POSTING_COLUMNS)
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(and(eq(jobPostings.userId, userId), eq(jobMatches.state, state)))
    .orderBy(desc(jobPostings.firstSeenAt));

  const attached = await attachSourcesAndScore(rows);
  return rows.map((row) => toPostingView(row, attached.get(row.id)!));
}

export type PostingSortKey = "score" | "newest" | "pay";

/** The sort column for each `PostingSortKey`, as a SQL expression -- `newest` coalesces to `firstSeenAt` since
 *  `sourcePostedAt` isn't always stated, the same fallback `sort-postings.ts`'s client-side sort used. */
const SORT_COLUMN: Record<PostingSortKey, SQL> = {
  score: sql`${jobMatches.score}`,
  pay: sql`${jobPostings.payAmount}`,
  newest: sql`coalesce(${jobPostings.sourcePostedAt}, ${jobPostings.firstSeenAt})`,
};

/** A WHERE condition for "the next page after this cursor" in `column DESC NULLS LAST` order, tiebroken by
 *  `id DESC` -- correct even while new postings are inserted mid-scroll (the freehire poll runs every minute),
 *  unlike an OFFSET that silently skips or repeats a row when a new one is inserted ahead of the current page.
 *  `cursorValue` null means the cursor itself was already in the trailing "nulls" region. */
function keysetAfter(
  column: SQL,
  idColumn: typeof jobPostings.id,
  cursorValue: number | Date | null,
  cursorId: string,
): SQL {
  if (cursorValue === null) return sql`(${column} is null and ${idColumn} < ${cursorId})`;
  return sql`((${column} is not null and (${column} < ${cursorValue} or (${column} = ${cursorValue} and ${idColumn} < ${cursorId}))) or ${column} is null)`;
}

/** One cursor-paginated page of postings for the infinite-scrolled New list: search and sort run in SQL, not in
 *  the browser, so the page response only ever carries `limit` postings regardless of how many the owner has.
 *  `cursorId` null means the first page. Fetches one extra row to know `hasMore` without a separate count query. */
export async function listPostingsPage(
  userId: string,
  params: {
    state: JobMatchState;
    search: string;
    sort: PostingSortKey;
    board?: string;
    cursorValue: string | null;
    cursorId: string | null;
    limit: number;
  },
): Promise<{ postings: PostingView[]; hasMore: boolean }> {
  const column = SORT_COLUMN[params.sort];
  const search = params.search.trim();
  const conditions = [eq(jobPostings.userId, userId), eq(jobMatches.state, params.state)];
  if (params.board) conditions.push(eq(jobPostings.originBoard, params.board));
  if (search) {
    const term = `%${search}%`;
    conditions.push(sql`(${ilike(jobPostings.title, term)} or ${ilike(jobPostings.company, term)})`);
  }
  if (params.cursorId !== null) {
    const cursorValue =
      params.cursorValue === null
        ? null
        : params.sort === "newest"
          ? new Date(params.cursorValue)
          : Number(params.cursorValue);
    conditions.push(keysetAfter(column, jobPostings.id, cursorValue, params.cursorId));
  }

  const rows = await db()
    .select(POSTING_COLUMNS)
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(and(...conditions))
    .orderBy(sql`${column} desc nulls last`, desc(jobPostings.id))
    .limit(params.limit + 1);

  const hasMore = rows.length > params.limit;
  const page = rows.slice(0, params.limit);
  const attached = await attachSourcesAndScore(page);
  return { postings: page.map((row) => toPostingView(row, attached.get(row.id)!)), hasMore };
}

/** One posting by ID, scoped to its owner so one user can't read another's posting by guessing an ID
 *  (docs/mockups/job-finder.md, "Redesign" -- the job detail page). Null when it doesn't exist or isn't theirs. */
export async function getPosting(userId: string, postingId: string): Promise<PostingView | null> {
  const [row] = await db()
    .select(POSTING_COLUMNS)
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(and(eq(jobPostings.userId, userId), eq(jobPostings.id, postingId)))
    .limit(1);
  if (!row) return null;

  const attached = await attachSourcesAndScore([row]);
  return toPostingView(row, attached.get(row.id)!);
}

/** Clears the New badge the first time the owner opens this posting's detail page -- a no-op on every later
 *  visit, since `viewedAt` only ever moves from null to a timestamp. Scoped to the owner's own posting. */
export async function markViewed(userId: string, postingId: string): Promise<void> {
  await db()
    .update(jobMatches)
    .set({ viewedAt: new Date() })
    .where(
      and(eq(jobMatches.postingId, postingId), eq(jobMatches.userId, userId), sql`${jobMatches.viewedAt} is null`),
    );
}

/** Save toggle: sets `savedAt` to now or clears it back to null (ADR-003 -- a direct toggle, no confirmation,
 *  unlike Applied). Scoped to the owner's own posting. */
export async function setSaved(userId: string, postingId: string, saved: boolean): Promise<void> {
  await db()
    .update(jobMatches)
    .set({ savedAt: saved ? new Date() : null })
    .where(and(eq(jobMatches.postingId, postingId), eq(jobMatches.userId, userId)));
}

/** Other open postings from the same company, for the job detail page's "Related postings" section. Scoped to
 *  `new` only -- a related posting the owner already filtered out or dismissed isn't worth resurfacing here. */
export async function getRelatedPostings(userId: string, company: string, excludeId: string): Promise<PostingView[]> {
  const rows = await db()
    .select(POSTING_COLUMNS)
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(
      and(
        eq(jobPostings.userId, userId),
        eq(jobMatches.state, "new"),
        ilike(jobPostings.company, company),
        ne(jobPostings.id, excludeId),
      ),
    )
    .orderBy(desc(jobMatches.score), desc(jobPostings.firstSeenAt))
    .limit(4);

  const attached = await attachSourcesAndScore(rows);
  return rows.map((row) => toPostingView(row, attached.get(row.id)!));
}

/** Other open postings with the same job title, anywhere -- not scoped to one company, unlike
 *  `getRelatedPostings` above. Excludes the current posting's own company so the two "related" sections on the
 *  job detail page never show the same posting twice. */
export async function getRelatedByRole(
  userId: string,
  title: string,
  company: string,
  excludeId: string,
): Promise<PostingView[]> {
  const rows = await db()
    .select(POSTING_COLUMNS)
    .from(jobPostings)
    .innerJoin(jobMatches, eq(jobMatches.postingId, jobPostings.id))
    .where(
      and(
        eq(jobPostings.userId, userId),
        eq(jobMatches.state, "new"),
        ilike(jobPostings.title, title),
        sql`lower(${jobPostings.company}) != lower(${company})`,
        ne(jobPostings.id, excludeId),
      ),
    )
    .orderBy(desc(jobMatches.score), desc(jobPostings.firstSeenAt))
    .limit(4);

  const attached = await attachSourcesAndScore(rows);
  return rows.map((row) => toPostingView(row, attached.get(row.id)!));
}

/** Re-evaluates every stored posting against the current preferences (docs/product/job-finder.md: "Changing a
 *  setting refilters existing postings without a new alert"). Only touches a match's state and reason when the
 *  verdict actually changed. A not-yet-processed posting's extracted-field columns are all null, so `filterReason`
 *  only applies the step-1 checks to it, same as it always has. */
export async function refilterExisting(userId: string): Promise<void> {
  const preferences = await getPreferences(userId);
  const context = await filterContext();
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
  descriptionHtml: string | null;
  sourceCountries: string[] | null;
  sourceWorkMode: "remote" | "hybrid" | "onsite" | null;
  sourceEmploymentType: string | null;
  sourceSalaryMin: number | null;
  sourceSalaryMax: number | null;
  sourceSalaryCurrency: string | null;
  sourceSalaryPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  sourceExperienceYearsMin: number | null;
};

const PENDING_POSTING_FIELDS = {
  id: jobPostings.id,
  title: jobPostings.title,
  company: jobPostings.company,
  location: jobPostings.location,
  snippet: jobPostings.snippet,
  descriptionHtml: jobPostings.descriptionHtml,
  sourceSalaryMin: jobPostings.sourceSalaryMin,
  sourceSalaryMax: jobPostings.sourceSalaryMax,
  sourceSalaryCurrency: jobPostings.sourceSalaryCurrency,
  sourceSalaryPeriod: jobPostings.sourceSalaryPeriod,
  sourceExperienceYearsMin: jobPostings.sourceExperienceYearsMin,
  sourceCountries: jobPostings.sourceCountries,
  sourceWorkMode: jobPostings.sourceWorkMode,
  sourceEmploymentType: jobPostings.sourceEmploymentType,
} as const;

/** Up to `limit` postings not yet processed by `/api/jobs/process`, oldest first (plans/jobs-score.md, Slice 1).
 *  A plain read for inspecting pending state; `claimPendingPostings` is what the pipeline itself uses, so looking
 *  never changes what's pending. */
export async function getPendingPostings(userId: string, limit: number): Promise<PendingPosting[]> {
  return db()
    .select(PENDING_POSTING_FIELDS)
    .from(jobPostings)
    .where(and(eq(jobPostings.userId, userId), isNull(jobPostings.processedAt)))
    .orderBy(asc(jobPostings.firstSeenAt))
    .limit(limit);
}

/** Claims up to `limit` not-yet-processed postings for this run, stamping `processedAt` immediately under
 *  `FOR UPDATE SKIP LOCKED`: when the outside scheduler's own poll and a manual "run pipeline" click overlap,
 *  whichever gets here first locks the rows and the other skips straight past them to the next unclaimed batch,
 *  instead of both sending the same postings to the AI extractor. If extraction then fails, `unclaimPosting`
 *  undoes the stamp so the posting is retried on the next poll rather than lost. */
export async function claimPendingPostings(userId: string, limit: number): Promise<PendingPosting[]> {
  return db().transaction(async (tx) => {
    const locked = await tx
      .select({ id: jobPostings.id })
      .from(jobPostings)
      .where(and(eq(jobPostings.userId, userId), isNull(jobPostings.processedAt)))
      .orderBy(asc(jobPostings.firstSeenAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (!locked.length) return [];
    return tx
      .update(jobPostings)
      .set({ processedAt: new Date() })
      .where(
        inArray(
          jobPostings.id,
          locked.map((row) => row.id),
        ),
      )
      .returning(PENDING_POSTING_FIELDS);
  });
}

/** Undoes `claimPendingPostings`' stamp on a posting whose extraction didn't finish, so the next poll retries it
 *  instead of treating it as done. */
export async function unclaimPosting(postingId: string): Promise<void> {
  await db().update(jobPostings).set({ processedAt: null }).where(eq(jobPostings.id, postingId));
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
  const context = await filterContext();
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
