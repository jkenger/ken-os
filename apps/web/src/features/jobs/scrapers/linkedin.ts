import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Scrapes LinkedIn's own signed-out guest search endpoint (docs/product/job-finder.md, "Getting postings in"), the
// technique JobSpy uses (github.com/speedyapply/JobSpy). No sign-in, no API key: a plain GET that returns the same
// HTML job cards LinkedIn's guest job search page renders. The source ID comes from each card's own
// data-entity-urn ("urn:li:jobPosting:<id>"), the same ID the alert-email parser reads from the card's link.

const SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";

export function linkedInSearchUrl(keyword: string): string {
  const params = new URLSearchParams({ keywords: keyword });
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
