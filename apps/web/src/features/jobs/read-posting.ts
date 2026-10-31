import * as cheerio from "cheerio";
import type { AlertSource } from "./raw-posting";

// Reads one posting's full description from its own page, once per posting (docs/product/job-finder.md, "Read the
// full posting"). Tries each source LinkedIn before Indeed, since Indeed's public page blocks this more often.
// Falls through to the next source on a non-200, a page that reads as 200 but doesn't match the known description
// markup (a soft block), or a page whose markup is there but genuinely empty.

const SOURCE_ORDER: AlertSource[] = ["linkedin", "indeed"];

export function orderedSourceLinks<T extends { source: AlertSource }>(sources: T[]): T[] {
  return [...sources].sort((a, b) => SOURCE_ORDER.indexOf(a.source) - SOURCE_ORDER.indexOf(b.source));
}

/** LinkedIn's own description container, the same one JobSpy's `_fetch_details` reads
 * (github.com/speedyapply/JobSpy). */
export function parseLinkedInDescription(html: string): string | null {
  const text = cheerio.load(html)(".show-more-less-html__markup").first().text().trim();
  return text || null;
}

/** Indeed's long-standing public description container id. Unlike the LinkedIn selector above, this one is not
 * verified against JobSpy's own source — JobSpy reads Indeed's description through its GraphQL API, not this
 * public page. Re-save the fixture from a real page before this handles production traffic. */
export function parseIndeedDescription(html: string): string | null {
  const text = cheerio.load(html)("#jobDescriptionText").first().text().trim();
  return text || null;
}

const PARSERS: Record<AlertSource, (html: string) => string | null> = {
  linkedin: parseLinkedInDescription,
  indeed: parseIndeedDescription,
};

export async function readFullPosting(
  sources: { source: AlertSource; link: string }[],
  fetchPage: (source: AlertSource, url: string) => Promise<{ status: number; html: string }>,
): Promise<string | null> {
  for (const { source, link } of orderedSourceLinks(sources)) {
    const response = await fetchPage(source, link);
    if (response.status !== 200) continue;
    const description = PARSERS[source](response.html);
    if (description) return description;
  }
  return null;
}
