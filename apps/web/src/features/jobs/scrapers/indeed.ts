import type { RawPosting } from "../raw-posting";
import { plainText } from "./freehire";

// Parses Indeed's mobile-app GraphQL endpoint (plans/jobs-scraper-sources.md, Slice 2): cross-confirmed against
// speedyapply/JobSpy's implementation (`jobspy/indeed/constant.py`, `__init__.py`) and a live capture this
// session. The static `indeed-api-key` below is baked into the published Indeed app itself, not per-account.
//
// Unlike LinkedIn, every result already carries its full description inline (`description.html`) -- no separate
// detail fetch needed, the same shape freehire's own search results have.
//
// `checkScraperSource` (`scraper-contract.ts`) only threads a `string` URL from `searchUrl` into `fetchSearch`,
// but Indeed's real request is a POST with a GraphQL body, not a GET. `indeedSearchUrl` encodes the keyword as
// a query param purely so `pipeline.ts`'s `fetchSearch` can read it back out and build the real POST -- this
// "URL" is never actually fetched as a GET.

export const INDEED_API_URL = "https://apis.indeed.com/graphql";
const INDEED_PH_JOB_URL = "https://ph.indeed.com/viewjob";

export const INDEED_HEADERS = {
  "content-type": "application/json",
  "indeed-api-key": "161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8",
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1",
  "indeed-app-info": "appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone",
  "indeed-co": "PH",
  "indeed-locale": "en-PH",
};

export function indeedSearchUrl(keyword: string): string {
  return `${INDEED_API_URL}?${new URLSearchParams({ q: keyword })}`;
}

export function indeedSearchQuery(keyword: string, cursor: string | null): string {
  return `
    query GetJobData {
      jobSearch(
        what: ${JSON.stringify(keyword)}
        location: {where: "Philippines", radius: 50, radiusUnit: MILES}
        limit: 100
        ${cursor ? `cursor: ${JSON.stringify(cursor)}` : ""}
        sort: RELEVANCE
      ) {
        pageInfo { nextCursor }
        results {
          job {
            key
            title
            sourceEmployerName
            dateOnIndeed
            description { html }
            location { city }
            employer { name }
            recruit { viewJobUrl }
          }
        }
      }
    }
  `;
}

type IndeedJob = {
  key?: string;
  title?: string;
  sourceEmployerName?: string;
  dateOnIndeed?: number;
  description?: { html?: string };
  location?: { city?: string };
  employer?: { name?: string };
  recruit?: { viewJobUrl?: string };
};

export function parseIndeedSearch(responseText: string): RawPosting[] {
  let jobs: IndeedJob[];
  try {
    const parsed = JSON.parse(responseText) as { data?: { jobSearch?: { results?: { job?: IndeedJob }[] } } };
    const results = parsed.data?.jobSearch?.results ?? [];
    jobs = results.map((result) => result.job).filter((job): job is IndeedJob => job != null);
  } catch {
    return [];
  }

  const postings: RawPosting[] = [];
  for (const job of jobs) {
    const key = job.key?.trim();
    const title = job.title?.trim();
    if (!key || !title) continue;

    const html = job.description?.html?.trim() ?? "";
    postings.push({
      source: "indeed",
      sourceId: `in-${key}`,
      title,
      company: (job.employer?.name?.trim() || job.sourceEmployerName?.trim()) ?? "",
      location: job.location?.city?.trim() ?? "",
      snippet: plainText(html),
      descriptionHtml: html ? html : null,
      link: job.recruit?.viewJobUrl?.trim() || `${INDEED_PH_JOB_URL}?jk=${key}`,
      postedAt: job.dateOnIndeed ? new Date(job.dateOnIndeed).toISOString() : null,
    });
  }
  return postings;
}
