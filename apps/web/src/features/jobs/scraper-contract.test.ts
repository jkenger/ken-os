import assert from "node:assert/strict";
import { test } from "node:test";
import { checkScraperSource } from "./scraper-contract";

function noopDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    keywords: ["Frontend Engineer"],
    searchUrl: (keyword: string) => `https://example.com/search?q=${keyword}`,
    parse: () => [],
    fetchSearch: async () => ({ status: 200, text: "" }),
    isBlockedStatus: (status: number) => status === 403 || status === 429,
    savePostings: async () => {},
    getBlockedUntil: async () => null,
    recordBlocked: async () => {},
    recordRunning: async () => {},
  };
}

const posting = {
  source: "linkedin" as const,
  sourceId: "li-1",
  title: "Frontend Engineer",
  company: "Acme",
  location: "Remote",
  snippet: "",
  link: "https://example.com/a",
};

test("a correct secret, unblocked, searches every keyword in order and saves what it finds", async () => {
  const fetchedUrls: string[] = [];
  const saved: unknown[] = [];
  let ranRunning = false;
  const result = await checkScraperSource({
    ...noopDeps(),
    keywords: ["Frontend Engineer", "React Developer"],
    parse: () => [posting],
    fetchSearch: async (url) => {
      fetchedUrls.push(url);
      return { status: 200, text: "ok" };
    },
    savePostings: async (postings) => {
      saved.push(...postings);
    },
    recordRunning: async () => {
      ranRunning = true;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "ok");
  assert.equal(fetchedUrls.length, 2);
  assert.equal(saved.length, 2, "one posting found per keyword, both saved");
  assert.equal(result.found, 2, "found accumulates across keywords, not just the last one");
  assert.equal(ranRunning, true);
});

test("a wrong secret is rejected, nothing fetched, block state never read", async () => {
  let fetched = false;
  let blockRead = false;
  const result = await checkScraperSource({
    ...noopDeps(),
    secret: "wrong",
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, text: "" };
    },
    getBlockedUntil: async () => {
      blockRead = true;
      return null;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad secret");
  assert.equal(fetched, false);
  assert.equal(blockRead, false);
});

test("a call while blockedUntil is still in the future skips the fetch entirely", async () => {
  let fetched = false;
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const result = await checkScraperSource({
    ...noopDeps(),
    getBlockedUntil: async () => future,
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, text: "" };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, `blocked until ${future.toISOString()}`);
  assert.equal(fetched, false);
  assert.equal(result.found, 0);
});

test("a call while blockedUntil is in the past runs normally", async () => {
  const past = new Date(Date.now() - 60 * 60 * 1000);
  let fetched = false;
  const result = await checkScraperSource({
    ...noopDeps(),
    getBlockedUntil: async () => past,
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, text: "" };
    },
  });
  assert.equal(fetched, true);
  assert.equal(result.ok, true);
});

test("a 403 sets blockedUntil ~24h out, stops immediately, and saves nothing found before it", async () => {
  const fetchedUrls: string[] = [];
  const blockedUntils: Date[] = [];
  let ranRunning = false;
  const result = await checkScraperSource({
    ...noopDeps(),
    keywords: ["Frontend Engineer", "React Developer"],
    fetchSearch: async (url) => {
      fetchedUrls.push(url);
      return { status: 403, text: "" };
    },
    recordBlocked: async (until) => {
      blockedUntils.push(until);
    },
    recordRunning: async () => {
      ranRunning = true;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "blocked");
  assert.equal(result.found, 0);
  assert.equal(fetchedUrls.length, 1, "stops at the first blocked response, never tries the second keyword");
  assert.equal(blockedUntils.length, 1);
  const hoursOut = (blockedUntils[0].getTime() - Date.now()) / (60 * 60 * 1000);
  assert.ok(hoursOut > 23.9 && hoursOut < 24.1, `expected ~24h out, got ${hoursOut}h`);
  assert.equal(ranRunning, false, "recordRunning is never called on a blocked run");
});

test("a 429 is treated as a block the same way a 403 is", async () => {
  let blocked = false;
  const result = await checkScraperSource({
    ...noopDeps(),
    fetchSearch: async () => ({ status: 429, text: "" }),
    recordBlocked: async () => {
      blocked = true;
    },
  });
  assert.equal(result.reason, "blocked");
  assert.equal(blocked, true);
});

test("a non-200, non-blocked status for one keyword is skipped -- other keywords still save, run still records", async () => {
  const saved: unknown[] = [];
  let ranRunning = false;
  const result = await checkScraperSource({
    ...noopDeps(),
    keywords: ["Frontend Engineer", "React Developer"],
    parse: () => [posting],
    fetchSearch: async (url) => {
      if (url.includes("Frontend")) return { status: 500, text: "" };
      return { status: 200, text: "ok" };
    },
    savePostings: async (postings) => {
      saved.push(...postings);
    },
    recordRunning: async () => {
      ranRunning = true;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "ok");
  assert.equal(saved.length, 1, "the failing keyword contributes nothing, the working one still saves");
  assert.equal(ranRunning, true);
});

test("a keyword with no results found calls savePostings zero times for that keyword", async () => {
  let saveCalls = 0;
  const result = await checkScraperSource({
    ...noopDeps(),
    parse: () => [],
    fetchSearch: async () => ({ status: 200, text: "ok" }),
    savePostings: async () => {
      saveCalls++;
    },
  });
  assert.equal(result.found, 0);
  assert.equal(saveCalls, 0);
});
