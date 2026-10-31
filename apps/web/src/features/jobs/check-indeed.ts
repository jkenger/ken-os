import { checkSource } from "./check-source";
import type { RawPosting } from "./raw-posting";
import { indeedSearchBody, isIndeedSearchError, parseIndeedSearch } from "./scrapers/indeed";

/**
 * Checks Indeed for each role via the shared `checkSource` orchestration (docs/product/job-finder.md, "Getting
 * postings in"). A block signal is a non-200 status or a response that isn't a valid, error-free GraphQL result
 * (a genuinely empty `results` array is not an error).
 */
export async function checkIndeed(params: {
  secret: string;
  expectedSecret: string;
  keywords: string[];
  isBlocked: () => Promise<boolean>;
  fetchSearch: (body: string) => Promise<{ status: number; json: string }>;
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
      const response = await params.fetchSearch(indeedSearchBody(keyword));
      if (response.status !== 200 || isIndeedSearchError(response.json)) return { blocked: true, postings: [] };
      return { blocked: false, postings: parseIndeedSearch(response.json) };
    },
  });
}
