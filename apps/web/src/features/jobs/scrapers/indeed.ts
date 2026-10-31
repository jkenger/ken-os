import type { RawPosting } from "../raw-posting";

// Scrapes Indeed's own mobile-app GraphQL endpoint (docs/product/job-finder.md, "Getting postings in"), the
// technique JobSpy uses (github.com/speedyapply/JobSpy): a POST with the fixed API key and user agent the Indeed
// iOS app itself sends, no sign-in. The source ID comes from the job's own "key" field, the same ID the alert-email
// parser used to read from the "jk" query parameter.

const API_URL = "https://apis.indeed.com/graphql";
const FRESHNESS_HOURS = 24;

/** The fixed credentials JobSpy's Indeed scraper uses: Indeed's own public mobile-app API key and the iOS app's
 *  exact user agent, not a declared bot. */
export const INDEED_HEADERS = {
  "content-type": "application/json",
  accept: "application/json",
  "accept-language": "en-US,en;q=0.9",
  "indeed-api-key": "161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8",
  "user-agent":
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Indeed App 193.1",
  "indeed-app-info": "appv=193.1; appid=com.indeed.jobsearch; osv=16.6.1; os=ios; dtype=phone",
  "indeed-co": "US",
  "indeed-locale": "en-US",
};

export function indeedSearchBody(keyword: string): string {
  const query = `
    query GetJobData {
      jobSearch(
        what: ${JSON.stringify(keyword)}
        limit: 20
        sort: RELEVANCE
        filters: [{ date: { field: "dateOnIndeed", start: "${FRESHNESS_HOURS}h" } }]
      ) {
        results {
          job {
            key
            title
            sourceEmployerName
            location { city admin1Code }
            employer { name }
          }
        }
      }
    }
  `;
  return JSON.stringify({ query });
}

/** A response that isn't valid JSON, carries a GraphQL `errors` array, or has no `data.jobSearch` at all is
 *  probably a block or rate limit, not a search that simply found nothing. A genuinely empty `results` array is
 *  not an error. */
export function isIndeedSearchError(responseText: string): boolean {
  let parsed: { errors?: unknown; data?: { jobSearch?: { results?: unknown } } | null };
  try {
    parsed = JSON.parse(responseText) as typeof parsed;
  } catch {
    return true;
  }
  if (parsed.errors) return true;
  if (!parsed.data?.jobSearch?.results) return true;
  return false;
}

type IndeedJob = {
  key?: string;
  title?: string;
  sourceEmployerName?: string;
  location?: { city?: string; admin1Code?: string };
  employer?: { name?: string } | null;
};

export function parseIndeedSearch(responseText: string): RawPosting[] {
  let jobs: IndeedJob[];
  try {
    const parsed = JSON.parse(responseText) as {
      data?: { jobSearch?: { results?: { job?: IndeedJob }[] } } | null;
    };
    jobs = (parsed.data?.jobSearch?.results ?? []).map((result) => result.job).filter((job): job is IndeedJob => !!job);
  } catch {
    return [];
  }

  const postings: RawPosting[] = [];
  for (const job of jobs) {
    const title = job.title?.trim();
    const key = job.key?.trim();
    if (!title || !key) continue;

    const company = job.employer?.name?.trim() || job.sourceEmployerName?.trim() || "";
    const city = job.location?.city?.trim();
    const state = job.location?.admin1Code?.trim();
    const location = [city, state].filter(Boolean).join(", ");

    postings.push({
      source: "indeed",
      sourceId: `in-${key}`,
      title,
      company,
      location,
      snippet: "",
      link: `https://www.indeed.com/viewjob?jk=${key}`,
    });
  }
  return postings;
}
