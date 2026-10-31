import type { RawPosting } from "./raw-posting";
import { freehireSearchUrl, parseFreehireSearch } from "./scrapers/freehire";

const FRESHNESS_DAYS = 1;
const RESULTS_PER_KEYWORD = 25;

/**
 * Searches freehire for each of the owner's roles (plans/jobs-freehire-source.md). Unlike the LinkedIn/Indeed
 * scrapers this replaces, there's no block-detection loop: freehire is a cooperative, public, unauthenticated API,
 * not a site actively trying to stop scraping, so a failed request for one keyword is just skipped for this run,
 * not escalated to a block state -- the other keywords, and the next poll, are unaffected. Searches run in
 * parallel; there's no reason to pace requests against an API with no documented rate limit.
 */
export async function checkFreehire(params: {
  secret: string;
  expectedSecret: string;
  keywords: string[];
  fetchSearch: (url: string) => Promise<{ status: number; text: string }>;
  savePostings: (postings: RawPosting[]) => Promise<void>;
}): Promise<{ ok: boolean; reason: string; found: number }> {
  if (params.secret !== params.expectedSecret) return { ok: false, reason: "bad secret", found: 0 };

  const responses = await Promise.all(
    params.keywords.map((keyword) =>
      params.fetchSearch(freehireSearchUrl(keyword, FRESHNESS_DAYS, RESULTS_PER_KEYWORD)),
    ),
  );
  const postings = responses.flatMap((response) => (response.status === 200 ? parseFreehireSearch(response.text) : []));

  if (postings.length) await params.savePostings(postings);
  return { ok: true, reason: "ok", found: postings.length };
}
