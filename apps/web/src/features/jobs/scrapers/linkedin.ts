import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Parses LinkedIn's signed-out guest job search (plans/jobs-scraper-sources.md, Slice 1): the same endpoint this
// project's own deleted scraper used, cross-confirmed against speedyapply/JobSpy's implementation and a live
// capture this session. 10 cards/page (confirmed against the saved fixture), paged via `start`.
//
// Unlike freehire, a card carries no description at all -- `snippet` stays empty and `fetchFullDescription`
// (the hook `store.ts`'s `savePostings` already supports) calls `parseLinkedInDescription` against
// `linkedInDetailUrl` the first time a posting's genuinely new. The bare numeric id is enough -- confirmed live
// that `/jobs/view/<id>` returns the same page as the card's own slugged link, so the detail fetch needs only
// the `li-`-stripped sourceId, the same shape freehire's own detail fetch already uses.

export const LINKEDIN_SEARCH_URL = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const LINKEDIN_JOB_URL = "https://www.linkedin.com/jobs/view";

export function linkedInSearchUrl(keywords: string, start: number): string {
  const params = new URLSearchParams({ keywords, location: "Philippines", start: String(start) });
  return `${LINKEDIN_SEARCH_URL}?${params}`;
}

/** `id` is the posting's own numeric LinkedIn job id, not this app's `li`-prefixed `sourceId` -- strip that
 *  prefix before calling this (see `pipeline.ts`). */
export function linkedInDetailUrl(id: string): string {
  return `${LINKEDIN_JOB_URL}/${encodeURIComponent(id)}`;
}

export function parseLinkedInSearch(html: string): RawPosting[] {
  const $ = cheerio.load(html);
  const postings: RawPosting[] = [];

  $(".base-search-card").each((_, element) => {
    const card = $(element);
    const title = card.find(".base-search-card__title").text().trim();
    const link = card.find(".base-card__full-link").attr("href")?.trim();
    if (!title || !link) return;

    const urn = card.attr("data-entity-urn") ?? "";
    const idMatch = urn.match(/jobPosting:(\d+)/);

    postings.push({
      source: "linkedin",
      sourceId: idMatch ? `li-${idMatch[1]}` : null,
      title,
      company: card.find(".base-search-card__subtitle").text().trim(),
      location: card.find(".job-search-card__location").text().trim(),
      snippet: "",
      descriptionHtml: null,
      link,
      postedAt: card.find("time.job-search-card__listdate").attr("datetime") ?? null,
    });
  });

  return postings;
}

/** The complete description's HTML off the posting's own detail page, or `null` when the page doesn't parse or
 *  states no description -- never a guess. Called once per posting via `fetchFullDescription`, mirroring
 *  freehire's own one-job detail fetch (`scrapers/freehire.ts`). */
export function parseLinkedInDescription(html: string): string | null {
  const $ = cheerio.load(html);
  const inner = $(".show-more-less-html__markup").first().html()?.trim();
  return inner ? inner : null;
}
