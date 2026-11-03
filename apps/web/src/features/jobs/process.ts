import { plainText } from "./scrapers/freehire";
import { secretsMatch } from "./secret";
import { formatShift, shiftLabel } from "./shift";

// Reads, extracts and saves structured fields for the owner's pending postings (plans/jobs-score.md, Slice 1).
// Dependencies are injected so this stays testable without a real HTTP call, AI call or database. `snippet` is
// the search result's own description, truncated to roughly 1000 characters by freehire itself; `descriptionHtml`
// is the untruncated text `store.ts` fetched from the one-job detail endpoint the first time the posting was
// genuinely new (freehire.ts, `plainText`'s own doc comment). Extraction decodes that HTML to plain text and
// reads from it whenever it's there, so a posting's stored "full description" is the actual full text, not the
// truncated preview -- falling back to `snippet` only for a posting that has no `descriptionHtml` at all.

const BATCH_SIZE = 5;

type PendingPosting = {
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

const JOB_TYPES = ["full_time", "part_time", "contract", "internship", "temporary"] as const;
type JobType = (typeof JOB_TYPES)[number];

function isJobType(value: string): value is JobType {
  return (JOB_TYPES as readonly string[]).includes(value);
}

type ExtractResult = {
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: "hour" | "day" | "week" | "month" | "year" | null;
  jobType: "full_time" | "part_time" | "contract" | "internship" | "temporary" | null;
  workSetup: "remote" | "hybrid" | "on_site" | null;
  eligibilityStated: boolean;
  countries: string[];
  requiredHours: { start: string; end: string; timezoneOffsetMinutes: number } | null;
  hoursFlexible: boolean;
  seniority: "junior" | "mid" | "senior" | "lead" | null;
  yearsRequired: number | null;
  isAgency: boolean;
  summary: string;
  promptVersion: string;
  model: string;
};

type ExtractedFields = {
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
  shift: string;
  seniority: "junior" | "mid" | "senior" | "lead" | null;
  yearsRequired: number | null;
  isAgency: boolean;
  extractPromptVersion: string;
  extractModel: string;
};

export async function processPostings(params: {
  secret: string;
  expectedSecret: string;
  /** Claims up to `limit` postings so a concurrent run (the scheduler's own poll and a manual "run pipeline"
   *  click) can't also pick them up -- see `store.ts`'s `claimPendingPostings`. */
  getPending: (limit: number) => Promise<PendingPosting[]>;
  extract: (input: { title: string; company: string; location: string; text: string }) => Promise<ExtractResult>;
  saveExtracted: (postingId: string, fields: ExtractedFields) => Promise<void>;
  /** Undoes a claim on a posting this run didn't finish, so the next poll retries it instead of losing it. */
  unclaim: (postingId: string) => Promise<void>;
}): Promise<{ ok: boolean; reason: string; processed: number }> {
  if (!secretsMatch(params.secret, params.expectedSecret)) return { ok: false, reason: "bad secret", processed: 0 };

  const pending = await params.getPending(BATCH_SIZE);
  let processed = 0;
  try {
    for (const posting of pending) {
      await processOnePosting(posting, params.extract, params.saveExtracted);
      processed += 1;
    }
  } catch (error) {
    // Every posting from here on was claimed but never saved; let the next poll retry it rather than lose it.
    await Promise.all(pending.slice(processed).map((posting) => params.unclaim(posting.id)));
    throw error;
  }

  return { ok: true, reason: "ok", processed };
}

async function processOnePosting(
  posting: PendingPosting,
  extract: (input: { title: string; company: string; location: string; text: string }) => Promise<ExtractResult>,
  saveExtracted: (postingId: string, fields: ExtractedFields) => Promise<void>,
): Promise<void> {
  const fullDescription = posting.descriptionHtml ? plainText(posting.descriptionHtml) : posting.snippet || null;
  const partial = fullDescription === null;

  const extracted = await extract({
    title: posting.title,
    company: posting.company,
    location: posting.location,
    text: fullDescription ?? "",
  });

  // freehire's own structured fields are trusted over the model's reading of the same prose, since they come
  // from the source's own data (plans/jobs-freehire-source.md, Slice 2) -- but only when freehire actually
  // states them; an empty/null source field falls back to extraction exactly as before.
  const hasSourceCountries = (posting.sourceCountries?.length ?? 0) > 0;
  const eligibilityStated = hasSourceCountries ? true : extracted.eligibilityStated;
  const countries = hasSourceCountries
    ? posting.sourceCountries!.map((code) => code.toUpperCase())
    : extracted.countries;
  const workSetup = posting.sourceWorkMode
    ? posting.sourceWorkMode === "onsite"
      ? "on_site"
      : posting.sourceWorkMode
    : extracted.workSetup;
  const jobType =
    posting.sourceEmploymentType && isJobType(posting.sourceEmploymentType)
      ? posting.sourceEmploymentType
      : extracted.jobType;

  // A posting needs a currency and period alongside an amount for the pay filter to act on it at all (see
  // filters.ts), so the override only applies when freehire states at least one of min/max plus both of those
  // -- a bare amount with no currency/period isn't usable, and falls back to extraction entirely rather than
  // mixing a source amount with an extracted currency. Seniority is never overridden: freehire's own wording
  // ("intern", "middle", "principal", ...) doesn't map cleanly onto this app's four-value enum
  // (plans/jobs-freehire-source.md, Slice 3).
  const hasSourceSalary =
    (posting.sourceSalaryMin != null || posting.sourceSalaryMax != null) &&
    posting.sourceSalaryCurrency != null &&
    posting.sourceSalaryPeriod != null;
  const payAmount = hasSourceSalary
    ? posting.sourceSalaryMin != null && posting.sourceSalaryMax != null
      ? (posting.sourceSalaryMin + posting.sourceSalaryMax) / 2
      : (posting.sourceSalaryMin ?? posting.sourceSalaryMax)
    : extracted.payAmount;
  const payCurrency = hasSourceSalary ? posting.sourceSalaryCurrency : extracted.payCurrency;
  const payPeriod = hasSourceSalary ? posting.sourceSalaryPeriod : extracted.payPeriod;
  const yearsRequired = posting.sourceExperienceYearsMin ?? extracted.yearsRequired;
  const shift = formatShift(shiftLabel(extracted.requiredHours, extracted.hoursFlexible));

  await saveExtracted(posting.id, {
    fullDescription,
    partial,
    summary: extracted.summary,
    payAmount,
    payCurrency,
    payPeriod,
    jobType,
    workSetup,
    eligibilityStated,
    countries,
    shift,
    seniority: extracted.seniority,
    yearsRequired,
    isAgency: extracted.isAgency,
    extractPromptVersion: extracted.promptVersion,
    extractModel: extracted.model,
  });
}

// Scores every posting that has passed filtering and needs a score, either because it was just extracted or
// because the Profile has changed since it was last scored (plans/jobs-score.md, Slice 3). `getNeedingScore`
// decides what "needs a score" means (never scored, or scored against a stale Profile version); this function
// just batches and runs it, the same shape as `processPostings`.

type ScoreReason = { reason: string; citation: string };

type ScorablePosting = {
  id: string;
  title: string;
  company: string;
  fullDescription: string | null;
  summary: string;
};

type ScoreResult = {
  score: number;
  whyFits: ScoreReason[];
  whatsMissing: string[];
  promptVersion: string;
  model: string;
};

type ScoreFields = {
  score: number;
  whyFits: ScoreReason[];
  whatsMissing: string[];
  scorePromptVersion: string;
  profileVersionScored: Date | null;
};

export async function scorePostings(params: {
  secret: string;
  expectedSecret: string;
  getNeedingScore: (limit: number) => Promise<ScorablePosting[]>;
  getProfileForScoring: () => Promise<{ profile: unknown; version: Date | null }>;
  score: (input: { profile: unknown; title: string; company: string; text: string }) => Promise<ScoreResult>;
  saveScore: (postingId: string, fields: ScoreFields) => Promise<void>;
}): Promise<{ ok: boolean; reason: string; processed: number }> {
  if (!secretsMatch(params.secret, params.expectedSecret)) return { ok: false, reason: "bad secret", processed: 0 };

  const postings = await params.getNeedingScore(BATCH_SIZE);
  if (postings.length === 0) return { ok: true, reason: "ok", processed: 0 };

  const { profile, version } = await params.getProfileForScoring();
  for (const posting of postings) {
    const text = posting.fullDescription ?? posting.summary;
    const result = await params.score({ profile, title: posting.title, company: posting.company, text });
    await params.saveScore(posting.id, {
      score: result.score,
      whyFits: result.whyFits,
      whatsMissing: result.whatsMissing,
      scorePromptVersion: result.promptVersion,
      profileVersionScored: version,
    });
  }

  return { ok: true, reason: "ok", processed: postings.length };
}
