import type { RawPosting } from "./raw-posting";
import { secretsMatch } from "./secret";

const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Shared shape for a source that actively tries to stop scraping (LinkedIn, Indeed, JobStreet), unlike freehire's
 * cooperative API (`check-freehire.ts` stays separate and keeps its own simpler, non-blocking contract).
 * Keywords are searched one at a time, not in parallel (`check-freehire.ts`'s `Promise.all`), so a block on the
 * first keyword stops the run immediately instead of still firing the rest at an already-blocked source
 * (plans/jobs-scraper-sources.md, Slice 1). `getBlockedUntil`/`recordBlocked`/`recordRunning` are keyed by
 * source alone, not by account -- every account's search shares the same outbound IP, so one account's block
 * applies to every other account's calls too (`scraper-state.ts`).
 */
export async function checkScraperSource(params: {
  secret: string;
  expectedSecret: string;
  keywords: string[];
  searchUrl: (keyword: string) => string;
  parse: (responseText: string) => RawPosting[];
  fetchSearch: (url: string) => Promise<{ status: number; text: string }>;
  isBlockedStatus: (status: number) => boolean;
  savePostings: (postings: RawPosting[]) => Promise<void>;
  getBlockedUntil: () => Promise<Date | null>;
  recordBlocked: (until: Date) => Promise<void>;
  recordRunning: () => Promise<void>;
}): Promise<{ ok: boolean; reason: string; found: number }> {
  if (!secretsMatch(params.secret, params.expectedSecret)) return { ok: false, reason: "bad secret", found: 0 };

  const blockedUntil = await params.getBlockedUntil();
  if (blockedUntil && blockedUntil.getTime() > Date.now()) {
    return { ok: true, reason: `blocked until ${blockedUntil.toISOString()}`, found: 0 };
  }

  let found = 0;
  for (const keyword of params.keywords) {
    const response = await params.fetchSearch(params.searchUrl(keyword));
    if (params.isBlockedStatus(response.status)) {
      await params.recordBlocked(new Date(Date.now() + BLOCK_DURATION_MS));
      return { ok: true, reason: "blocked", found };
    }
    if (response.status === 200) {
      const postings = params.parse(response.text);
      if (postings.length > 0) {
        await params.savePostings(postings);
        found += postings.length;
      }
    }
  }

  await params.recordRunning();
  return { ok: true, reason: "ok", found };
}
