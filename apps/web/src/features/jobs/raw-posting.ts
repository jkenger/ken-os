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
};

/** New and Filtered out are this slice's states; Saved, Applied and Dismissed come with the side panel (step 2+). */
export type JobMatchState = "new" | "filtered_out";
