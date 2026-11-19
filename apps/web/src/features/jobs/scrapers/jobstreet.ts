import type { RawPosting } from "../raw-posting";

// Parses SEEK's PH edition (JobStreet) search and GraphQL job-details endpoints
// (plans/jobs-scraper-sources.md, Slice 4): PH-only (`siteKey`/`zone` below), same the way `linkedin.ts`
// hardcodes Philippines -- this project has no other market. The exact GraphQL details query is copied from
// speedyapply/JobSpy's own `jobspy/seek/constant.py` (`details_alias`), fetched live this session, not
// reinvented.
//
// JobSpy wraps every SEEK request in a TLS-impersonating client (`curl_cffi`); live-tested this session with
// the *real* batched details query (real job ids, the exact field selection above) against a plain `curl` with
// just a desktop User-Agent -- 200, real content, no errors. That proves the impersonation isn't load-bearing
// for this use case (a handful of requests a minute, not JobSpy's own bulk-scraping volume), so this scraper
// uses a plain `fetch`, no new dependency.
//
// shortcut: the details query batches one job id per call, not many at once the way JobSpy batches a whole
// page -- this only ever needs one id per call anyway (`fetchFullDescription` in `store.ts` already calls it
// once per posting, only the first time it's genuinely new), so there's nothing to batch here. Upgrade to a
// real multi-id batch only if a future caller needs many ids in one request.

export const JOBSTREET_SEARCH_URL = "https://au.seek.com/api/jobsearch/v5/search";
const JOBSTREET_GRAPHQL_URL = "https://au.seek.com/graphql";
const JOBSTREET_JOB_URL = "https://ph.jobstreet.com/job";
const SITE_KEY = "PH-Main";
const ZONE = "asia-6";

export function jobStreetSearchUrl(keywords: string, page: number): string {
  const params = new URLSearchParams({ siteKey: SITE_KEY, keywords, page: String(page), pageSize: "20" });
  return `${JOBSTREET_SEARCH_URL}?${params}`;
}

type JobStreetSearchResult = {
  id?: string;
  title?: string;
  companyName?: string;
  advertiser?: { description?: string };
  locations?: { label?: string }[];
  listingDate?: string;
};

export function parseJobStreetSearch(responseText: string): RawPosting[] {
  let results: JobStreetSearchResult[];
  try {
    const parsed = JSON.parse(responseText) as { data?: JobStreetSearchResult[] | null };
    results = parsed.data ?? [];
  } catch {
    return [];
  }

  const postings: RawPosting[] = [];
  for (const result of results) {
    const id = result.id?.trim();
    const title = result.title?.trim();
    if (!id || !title) continue;

    postings.push({
      source: "jobstreet",
      sourceId: `js-${id}`,
      title,
      company: result.companyName?.trim() || result.advertiser?.description?.trim() || "",
      location: result.locations?.[0]?.label?.trim() ?? "",
      snippet: "",
      descriptionHtml: null,
      link: `${JOBSTREET_JOB_URL}/${encodeURIComponent(id)}`,
      postedAt: result.listingDate ?? null,
    });
  }
  return postings;
}

const DETAILS_ALIAS = (id: string) => `
    j${id}: jobDetails(id: "${id}") {
        job {
            content(platform: WEB)
        }
    }
`;

/** `id` is the posting's own numeric SEEK job id, not this app's `js`-prefixed `sourceId` -- strip that prefix
 *  before calling this (see `pipeline.ts`). */
export function jobStreetDetailsRequestBody(id: string): { query: string; variables: { zone: string } } {
  return { query: `query($zone: Zone!) {${DETAILS_ALIAS(id)}}`, variables: { zone: ZONE } };
}

export { JOBSTREET_GRAPHQL_URL };

/** The job's description HTML off a details response keyed by its GraphQL alias (`j<id>`), or `null` when that
 *  id isn't present or the page states no content -- never a guess. */
export function parseJobStreetDetails(responseText: string, id: string): string | null {
  let data: Record<string, { job?: { content?: string } } | null> | undefined;
  try {
    data = (JSON.parse(responseText) as { data?: typeof data }).data;
  } catch {
    // data stays undefined -- handled the same way as a response with no matching id below
  }

  const content = data?.[`j${id}`]?.job?.content?.trim();
  return content ? content : null;
}
