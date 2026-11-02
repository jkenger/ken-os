import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Parses freehire's public search API (docs/product/job-finder.md, "Getting postings in";
// plans/jobs-freehire-source.md): no auth, no rate limit documented, confirmed reachable and working by a live
// query this session.
//
// The search endpoint's own `description` is truncated to roughly 1000 characters on every result, confirmed
// live this session (a posting whose real description ran 7780 characters came back as exactly 995, cut off
// mid-sentence, with no indication in the response that it's a preview) -- it is NOT the full text the way an
// earlier version of this comment assumed. The one-job detail endpoint (`freehireDetailUrl`/
// `parseFreehireDetail`) returns the complete, untruncated description for the same posting; `store.ts` calls it
// once per posting the first time it's actually saved, not on every poll, to avoid turning every search result
// into a second request.

export const FREEHIRE_SEARCH_URL = "https://freehire.me/api/v1/jobs/search";
export const FREEHIRE_JOBS_URL = "https://freehire.me/api/v1/jobs";

export function freehireSearchUrl(keyword: string, postedWithinDays: number, limit: number): string {
  const params = new URLSearchParams({
    q: keyword,
    posted_within_days: String(postedWithinDays),
    limit: String(limit),
  });
  return `${FREEHIRE_SEARCH_URL}?${params}`;
}

/** `slug` is the posting's own `public_slug`, not this app's `fh`-prefixed `sourceId` -- strip that prefix
 *  before calling this (see `store.ts`). */
export function freehireDetailUrl(slug: string): string {
  return `${FREEHIRE_JOBS_URL}/${encodeURIComponent(slug)}`;
}

/** The complete HTML description from the one-job detail endpoint, or `null` when the response doesn't parse or
 *  states no description -- never a guess, and never the search endpoint's truncated version. */
export function parseFreehireDetail(responseText: string): string | null {
  try {
    const parsed = JSON.parse(responseText) as { data?: { description?: string } | null };
    const description = parsed.data?.description?.trim();
    return description ? description : null;
  } catch {
    return null;
  }
}

/** Decodes a result's HTML description down to plain text, the same shape every other source's full description
 *  is in by the time it reaches `extract.ts`. */
function plainText(html: string): string {
  return cheerio.load(html)("body").text().replace(/\s+/g, " ").trim();
}

type FreehireResult = {
  public_slug?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  /** The ATS or job board freehire itself pulled this result from ("greenhouse", "workday", "whatjobs-uk", ...),
   *  confirmed live against freehire's own API this session -- distinct from this scraper's own `source: "freehire"`
   *  attribution below. */
  source?: string;
  countries?: string[];
  work_mode?: "remote" | "hybrid" | "onsite";
  skills?: string[];
  posted_at?: string;
  updated_at?: string;
  enrichment?: {
    employment_type?: string;
    salary_min?: number;
    salary_max?: number;
    salary_currency?: string;
    salary_period?: "hour" | "day" | "week" | "month" | "year";
    experience_years_min?: number;
  };
};

export function parseFreehireSearch(responseText: string): RawPosting[] {
  let results: FreehireResult[];
  try {
    const parsed = JSON.parse(responseText) as { data?: FreehireResult[] | null };
    results = parsed.data ?? [];
  } catch {
    return [];
  }

  const postings: RawPosting[] = [];
  for (const result of results) {
    const title = result.title?.trim();
    const slug = result.public_slug?.trim();
    const link = result.url?.trim();
    if (!title || !slug || !link) continue;

    postings.push({
      source: "freehire",
      sourceId: `fh-${slug}`,
      title,
      company: result.company?.trim() ?? "",
      location: result.location?.trim() ?? "",
      snippet: plainText(result.description ?? ""),
      descriptionHtml: result.description?.trim() ? result.description.trim() : null,
      originBoard: result.source?.trim() ? result.source.trim() : null,
      link,
      sourceCountries: result.countries ?? [],
      sourceWorkMode: result.work_mode ?? null,
      sourceEmploymentType: result.enrichment?.employment_type ?? null,
      sourceSalaryMin: result.enrichment?.salary_min ?? null,
      sourceSalaryMax: result.enrichment?.salary_max ?? null,
      sourceSalaryCurrency: result.enrichment?.salary_currency ?? null,
      sourceSalaryPeriod: result.enrichment?.salary_period ?? null,
      sourceExperienceYearsMin: result.enrichment?.experience_years_min ?? null,
      skills: result.skills ?? [],
      postedAt: result.posted_at ?? null,
      updatedAt: result.updated_at ?? null,
    });
  }
  return postings;
}
