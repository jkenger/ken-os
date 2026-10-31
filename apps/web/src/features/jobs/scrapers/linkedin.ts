import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Scrapes LinkedIn's own signed-out guest search endpoint (docs/product/job-finder.md, "Getting postings in"), the
// technique JobSpy uses (github.com/speedyapply/JobSpy). No sign-in, no API key: a plain GET that returns the same
// HTML job cards LinkedIn's guest job search page renders. The source ID comes from each card's own
// data-entity-urn ("urn:li:jobPosting:<id>"), the same ID the alert-email parser reads from the card's link.

const SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

/** Without a time filter, LinkedIn's guest search ranks by relevance and freely mixes in postings weeks or months
 *  old that are still open. Restricting to this window is what makes "fresh" actually mean fresh. */
const FRESHNESS_WINDOW_SECONDS = 24 * 60 * 60;

/** The exact body LinkedIn's guest search returns when a page genuinely has no more results. A 200 with no job
 *  cards that doesn't match this is probably a soft block (a captcha or interstitial), not an empty result. */
export const LINKEDIN_EMPTY_PAGE = "<!DOCTYPE html>\n\n<!---->";

export function isLinkedInEmptyPage(html: string): boolean {
  return html.trim() === LINKEDIN_EMPTY_PAGE;
}

/** A realistic browser header set, not a declared bot user agent. */
export const LINKEDIN_HEADERS = {
  accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export function linkedInSearchUrl(keyword: string): string {
  const params = new URLSearchParams({
    keywords: keyword,
    sortBy: "DD",
    f_TPR: `r${FRESHNESS_WINDOW_SECONDS}`,
  });
  return `${SEARCH_URL}?${params}`;
}

export function parseLinkedInSearch(html: string): RawPosting[] {
  const $ = cheerio.load(html);
  const postings: RawPosting[] = [];

  $(".base-search-card").each((_, card) => {
    const title = $(card).find(".base-search-card__title").first().text().trim();
    const entityUrn = $(card).attr("data-entity-urn") ?? "";
    const jobId = entityUrn.split(":").pop();
    if (!title || !jobId) return;

    postings.push({
      source: "linkedin",
      sourceId: `li-${jobId}`,
      title,
      company: $(card).find(".base-search-card__subtitle").first().text().trim(),
      location: $(card).find(".job-search-card__location").first().text().trim(),
      snippet: "",
      link: `https://www.linkedin.com/jobs/view/${jobId}`,
    });
  });

  return postings;
}
