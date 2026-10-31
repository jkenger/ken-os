// A posting pulled from one source (docs/product/job-finder.md). Everything after dedup never knows which source a
// posting came from except through `sourceId`'s prefix and `source` itself.

/** "linkedin"/"indeed" are kept only for reading and displaying postings scraped before the move to freehire
 *  (plans/jobs-freehire-source.md) -- nothing saves them anymore. Every new posting is "freehire". */
export type AlertSource = "linkedin" | "indeed" | "freehire";

export type RawPosting = {
  source: AlertSource;
  /** The source's own ID for the posting, prefixed by source ("li-123", "in-456", "fh-..."), when it's known. */
  sourceId: string | null;
  title: string;
  company: string;
  location: string;
  snippet: string;
  link: string;
  /** freehire's own structured eligibility/work-mode/employment-type fields, when it states them (empty/null
   *  when it doesn't -- never guessed). `process.ts` trusts these over AI extraction for the same posting,
   *  since they come from the source's own data, not a model re-reading prose
   *  (plans/jobs-freehire-source.md, Slice 2). `sourceCountries` is freehire's own lowercase ISO codes (e.g.
   *  "ph"); `sourceWorkMode` is one of freehire's three known values, confirmed live this session. */
  sourceCountries?: string[];
  sourceWorkMode?: "remote" | "hybrid" | "onsite" | null;
  sourceEmploymentType?: string | null;
  /** freehire's own enrichment salary/experience fields, when it states them (plans/jobs-freehire-source.md,
   *  Slice 3). Seniority is deliberately left out: freehire's own wording ("intern", "middle", "principal", ...)
   *  doesn't map cleanly onto this app's four-value enum, so seniority always falls back to AI extraction. */
  sourceSalaryMin?: number | null;
  sourceSalaryMax?: number | null;
  sourceSalaryCurrency?: string | null;
  sourceSalaryPeriod?: "hour" | "day" | "week" | "month" | "year" | null;
  sourceExperienceYearsMin?: number | null;
};

/** New and Filtered out are this slice's states; Saved, Applied and Dismissed come with the side panel (step 2+). */
export type JobMatchState = "new" | "filtered_out";
