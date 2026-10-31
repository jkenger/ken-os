// What a parser pulls from one source's alert email (docs/product/job-finder.md, "Split"). Everything after dedup
// never knows which source a posting came from except through `sourceId`'s prefix and `source` itself.

export type RawPosting = {
  source: "linkedin" | "indeed";
  /** The source's own ID for the posting, prefixed by source ("li-123", "in-456"), when the email exposes one. */
  sourceId: string | null;
  title: string;
  company: string;
  location: string;
  snippet: string;
  link: string;
};

/** New and Filtered out are this slice's states; Saved, Applied and Dismissed come with the side panel (step 2+). */
export type JobMatchState = "new" | "filtered_out";
