// A posting pulled from one source (docs/product/job-finder.md). Everything after dedup never knows which source a
// posting came from except through `sourceId`'s prefix and `source` itself.

export type AlertSource = "linkedin" | "indeed";

export type RawPosting = {
  source: AlertSource;
  /** The source's own ID for the posting, prefixed by source ("li-123", "in-456"), when it's known. */
  sourceId: string | null;
  title: string;
  company: string;
  location: string;
  snippet: string;
  link: string;
};

/** New and Filtered out are this slice's states; Saved, Applied and Dismissed come with the side panel (step 2+). */
export type JobMatchState = "new" | "filtered_out";
