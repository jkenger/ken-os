import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Pulls title, company, location, snippet and link from each job card in a forwarded LinkedIn alert email
// (docs/product/job-finder.md, "Split"). The source ID comes from the job's own linkedin.com/jobs/view/<id> link.

export function parseLinkedInAlert(html: string): RawPosting[] {
  const $ = cheerio.load(html);
  const postings: RawPosting[] = [];

  $(".job-card").each((_, card) => {
    const anchor = $(card).find(".job-card__title").first();
    const link = anchor.attr("href")?.trim();
    const title = anchor.text().trim();
    if (!link || !title) return;

    const idMatch = link.match(/\/jobs\/view\/(\d+)/);
    postings.push({
      source: "linkedin",
      sourceId: idMatch ? `li-${idMatch[1]}` : null,
      title,
      company: $(card).find(".job-card__company").first().text().trim(),
      location: $(card).find(".job-card__location").first().text().trim(),
      snippet: $(card).find(".job-card__snippet").first().text().trim(),
      link,
    });
  });

  return postings;
}
