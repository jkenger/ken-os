import type { RawPosting } from "./raw-posting";
import { linkedInSearchUrl, parseLinkedInSearch } from "./scrapers/linkedin";

/**
 * Checks the shared secret, skips while blocked, scrapes LinkedIn for each Alert keyword, saves what it finds, and
 * records the result (docs/product/job-finder.md, "Getting postings in"). Dependencies are injected so this stays
 * testable without a real HTTP call or database. One slice: a 403 or 429 on any keyword stops the whole run so a
 * block is recorded once per run, not once per keyword.
 */
export async function checkLinkedIn(params: {
  secret: string;
  expectedSecret: string;
  keywords: string[];
  isBlocked: () => Promise<boolean>;
  fetchSearch: (url: string) => Promise<{ status: number; html: string }>;
  savePostings: (postings: RawPosting[]) => Promise<void>;
  recordBlocked: () => Promise<void>;
  recordRun: (result: "ok" | "empty") => Promise<void>;
}): Promise<{ ok: boolean; reason: string }> {
  if (params.secret !== params.expectedSecret) return { ok: false, reason: "bad secret" };
  if (await params.isBlocked()) return { ok: true, reason: "skipped, blocked" };

  const postings: RawPosting[] = [];
  for (const keyword of params.keywords) {
    const response = await params.fetchSearch(linkedInSearchUrl(keyword));
    if (response.status === 403 || response.status === 429) {
      await params.recordBlocked();
      return { ok: true, reason: "blocked" };
    }
    postings.push(...parseLinkedInSearch(response.html));
  }

  if (postings.length) await params.savePostings(postings);
  await params.recordRun(postings.length ? "ok" : "empty");
  return { ok: true, reason: "ok" };
}
