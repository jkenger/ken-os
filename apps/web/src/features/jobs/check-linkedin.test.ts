import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLinkedIn } from "./check-linkedin";
import { LINKEDIN_EMPTY_PAGE } from "./scrapers/linkedin";

const linkedInFixtureHtml =
  '<div class="base-search-card" data-entity-urn="urn:li:jobPosting:1"><h3 class="base-search-card__title">Test Role</h3><h4 class="base-search-card__subtitle">Test Co</h4><span class="job-search-card__location">Remote</span></div>';

function noopDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    keywords: ["frontend engineer"],
    isBlocked: async () => false,
    fetchSearch: async () => ({ status: 200, html: LINKEDIN_EMPTY_PAGE }),
    savePostings: async () => {},
    recordBlocked: async () => {},
    recordRun: async () => {},
    wait: async () => {},
  };
}

test("a correct secret scrapes each keyword and saves the postings found", async () => {
  const fetchedUrls: string[] = [];
  const saved: unknown[] = [];
  let recordedResult: string | null = null;
  const result = await checkLinkedIn({
    ...noopDeps(),
    keywords: ["frontend engineer", "react developer"],
    fetchSearch: async (url) => {
      fetchedUrls.push(url);
      return { status: 200, html: linkedInFixtureHtml };
    },
    savePostings: async (postings) => {
      saved.push(...postings);
    },
    recordRun: async (result) => {
      recordedResult = result;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(fetchedUrls.length, 2);
  assert.equal(saved.length, 2);
  assert.equal(recordedResult, "ok");
});

test("waits between keyword requests, but not before the first", async () => {
  const waits: number[] = [];
  await checkLinkedIn({
    ...noopDeps(),
    keywords: ["frontend engineer", "react developer", "software engineer"],
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.equal(waits.length, 2, "two waits for three keywords: before the 2nd and 3rd, not the 1st");
  assert.ok(
    waits.every((ms) => ms > 0),
    "every wait is a real delay",
  );
});

test("a wrong secret is rejected and nothing is fetched", async () => {
  let fetched = false;
  const result = await checkLinkedIn({
    ...noopDeps(),
    secret: "wrong",
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, html: "" };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad secret");
  assert.equal(fetched, false);
});

test("a call while already blocked skips the fetch entirely", async () => {
  let fetched = false;
  const result = await checkLinkedIn({
    ...noopDeps(),
    isBlocked: async () => true,
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, html: "" };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "skipped, blocked");
  assert.equal(fetched, false);
});

for (const status of [403, 429]) {
  test(`a ${status} response stops the run, records the block, and saves nothing`, async () => {
    let blocked = false;
    const saved: unknown[] = [];
    const result = await checkLinkedIn({
      ...noopDeps(),
      fetchSearch: async () => ({ status, html: "" }),
      savePostings: async (postings) => {
        saved.push(...postings);
      },
      recordBlocked: async () => {
        blocked = true;
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.reason, "blocked");
    assert.equal(blocked, true);
    assert.equal(saved.length, 0);
  });
}

test("a known empty-results page with no job cards records an empty run, not blocked", async () => {
  let recordedResult: string | null = null;
  let blocked = false;
  const result = await checkLinkedIn({
    ...noopDeps(),
    fetchSearch: async () => ({ status: 200, html: LINKEDIN_EMPTY_PAGE }),
    recordRun: async (result) => {
      recordedResult = result;
    },
    recordBlocked: async () => {
      blocked = true;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(recordedResult, "empty");
  assert.equal(blocked, false);
});

test("a 200 response with no job cards that isn't the known empty-results page is treated as a soft block", async () => {
  let blocked = false;
  const result = await checkLinkedIn({
    ...noopDeps(),
    fetchSearch: async () => ({ status: 200, html: "<html><body>Please verify you're human</body></html>" }),
    recordBlocked: async () => {
      blocked = true;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "blocked");
  assert.equal(blocked, true);
});
