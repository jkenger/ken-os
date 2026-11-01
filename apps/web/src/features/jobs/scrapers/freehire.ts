import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Parses freehire's public search API (docs/product/job-finder.md, "Getting postings in";
// plans/jobs-freehire-source.md): no auth, no rate limit documented, confirmed reachable and working by a live
// query this session. Every result already carries a full HTML description -- no separate full-page fetch the
// way the sources this replaces needed (see `process.ts`).

export const FREEHIRE_SEARCH_URL = "https://freehire.me/api/v1/jobs/search";

export function freehireSearchUrl(keyword: string, postedWithinDays: number, limit: number): string {
  const params = new URLSearchParams({
    q: keyword,
    posted_within_days: String(postedWithinDays),
    limit: String(limit),
  });
  return `${FREEHIRE_SEARCH_URL}?${params}`;
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
