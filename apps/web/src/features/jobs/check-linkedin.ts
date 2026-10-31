import { checkSource } from "./check-source";
import type { RawPosting } from "./raw-posting";
import { isLinkedInEmptyPage, linkedInSearchUrl, parseLinkedInSearch } from "./scrapers/linkedin";

/**
 * Checks LinkedIn for each Alert keyword via the shared `checkSource` orchestration (docs/product/job-finder.md,
 * "Getting postings in"). A block signal is a 403, a 429, or a 200 with no job cards that isn't LinkedIn's own
 * known empty-results page.
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
  wait: (ms: number) => Promise<void>;
}): Promise<{ ok: boolean; reason: string }> {
  return checkSource({
    secret: params.secret,
    expectedSecret: params.expectedSecret,
    keywords: params.keywords,
    isBlocked: params.isBlocked,
    savePostings: params.savePostings,
    recordBlocked: params.recordBlocked,
    recordRun: params.recordRun,
    wait: params.wait,
    fetchOne: async (keyword) => {
      const response = await params.fetchSearch(linkedInSearchUrl(keyword));
      if (response.status === 403 || response.status === 429) return { blocked: true, postings: [] };

      const postings = parseLinkedInSearch(response.html);
      if (postings.length === 0 && !isLinkedInEmptyPage(response.html)) return { blocked: true, postings: [] };
      return { blocked: false, postings };
    },
  });
}
