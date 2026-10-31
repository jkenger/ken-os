import * as cheerio from "cheerio";
import type { RawPosting } from "../raw-posting";

// Pulls title, company, location, snippet and link from each job card in a forwarded Indeed alert email
// (docs/product/job-finder.md, "Split"). The source ID comes from the job's own "jk" query parameter.

export function parseIndeedAlert(html: string): RawPosting[] {
  const $ = cheerio.load(html);
  const postings: RawPosting[] = [];

  $(".jobCard").each((_, card) => {
    const anchor = $(card).find(".jobCard_title").first();
    const link = anchor.attr("href")?.trim();
    const title = anchor.text().trim();
    if (!link || !title) return;

    const jobKey = link.match(/[?&]jk=([^&]+)/)?.[1];
    postings.push({
      source: "indeed",
      sourceId: jobKey ? `in-${jobKey}` : null,
      title,
      company: $(card).find(".jobCard_company").first().text().trim(),
      location: $(card).find(".jobCard_location").first().text().trim(),
      snippet: $(card).find(".jobCard_snippet").first().text().trim(),
      link,
    });
  });

  return postings;
}
