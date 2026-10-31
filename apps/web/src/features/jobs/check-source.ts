import type { RawPosting } from "./raw-posting";

const DELAY_MS = 2000;

/**
 * The shape every source's check route shares (docs/product/job-finder.md, "Getting postings in"): check the
 * secret, skip while blocked, scrape each keyword with a pause between requests, save what's found, and record the
 * result. A block signal on any keyword stops the whole run, so a block is recorded once per run, not once per
 * keyword. Source-specific fetching, parsing and block detection live in `fetchOne`.
 */
export async function checkSource(params: {
  secret: string;
  expectedSecret: string;
  keywords: string[];
  isBlocked: () => Promise<boolean>;
  fetchOne: (keyword: string) => Promise<{ blocked: boolean; postings: RawPosting[] }>;
  savePostings: (postings: RawPosting[]) => Promise<void>;
  recordBlocked: () => Promise<void>;
  recordRun: (result: "ok" | "empty") => Promise<void>;
  wait: (ms: number) => Promise<void>;
}): Promise<{ ok: boolean; reason: string }> {
  if (params.secret !== params.expectedSecret) return { ok: false, reason: "bad secret" };
  if (await params.isBlocked()) return { ok: true, reason: "skipped, blocked" };

  const postings: RawPosting[] = [];
  for (const [index, keyword] of params.keywords.entries()) {
    if (index > 0) await params.wait(DELAY_MS);

    const result = await params.fetchOne(keyword);
    if (result.blocked) {
      await params.recordBlocked();
      return { ok: true, reason: "blocked" };
    }
    postings.push(...result.postings);
  }

  if (postings.length) await params.savePostings(postings);
  await params.recordRun(postings.length ? "ok" : "empty");
  return { ok: true, reason: "ok" };
}
