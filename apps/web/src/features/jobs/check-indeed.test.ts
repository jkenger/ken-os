import assert from "node:assert/strict";
import { test } from "node:test";
import { checkIndeed } from "./check-indeed";

const indeedFixtureJson = JSON.stringify({
  data: {
    jobSearch: {
      results: [
        {
          job: {
            key: "xyz789",
            title: "Test Role",
            sourceEmployerName: "Test Co",
            location: { city: "Remote", admin1Code: "" },
            employer: { name: "Test Co" },
          },
        },
      ],
    },
  },
});

function noopDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    keywords: ["backend engineer"],
    isBlocked: async () => false,
    fetchSearch: async () => ({ status: 200, json: JSON.stringify({ data: { jobSearch: { results: [] } } }) }),
    savePostings: async () => {},
    recordBlocked: async () => {},
    recordRun: async () => {},
    wait: async () => {},
  };
}

test("a correct secret searches each keyword and saves the postings found", async () => {
  const bodies: string[] = [];
  const saved: unknown[] = [];
  let recordedResult: string | null = null;
  const result = await checkIndeed({
    ...noopDeps(),
    keywords: ["backend engineer", "platform engineer"],
    fetchSearch: async (body) => {
      bodies.push(body);
      return { status: 200, json: indeedFixtureJson };
    },
    savePostings: async (postings) => {
      saved.push(...postings);
    },
    recordRun: async (result) => {
      recordedResult = result;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(bodies.length, 2);
  assert.ok(bodies[0]!.includes("backend engineer"));
  assert.equal(saved.length, 2);
  assert.equal(recordedResult, "ok");
});

test("waits between keyword requests, but not before the first", async () => {
  const waits: number[] = [];
  await checkIndeed({
    ...noopDeps(),
    keywords: ["backend engineer", "platform engineer"],
    wait: async (ms) => {
      waits.push(ms);
    },
  });
  assert.equal(waits.length, 1);
  assert.ok(waits[0]! > 0);
});

test("a wrong secret is rejected and nothing is fetched", async () => {
  let fetched = false;
  const result = await checkIndeed({
    ...noopDeps(),
    secret: "wrong",
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, json: "" };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad secret");
  assert.equal(fetched, false);
});

test("a call while already blocked skips the fetch entirely", async () => {
  let fetched = false;
  const result = await checkIndeed({
    ...noopDeps(),
    isBlocked: async () => true,
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, json: "" };
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
    const result = await checkIndeed({
      ...noopDeps(),
      fetchSearch: async () => ({ status, json: "" }),
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

test("a GraphQL errors response is treated as a block, not an empty result", async () => {
  let blocked = false;
  const result = await checkIndeed({
    ...noopDeps(),
    fetchSearch: async () => ({ status: 200, json: JSON.stringify({ errors: [{ message: "rate limited" }] }) }),
    recordBlocked: async () => {
      blocked = true;
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.reason, "blocked");
  assert.equal(blocked, true);
});

test("a genuinely empty result list records an empty run, not blocked", async () => {
  let recordedResult: string | null = null;
  let blocked = false;
  const result = await checkIndeed({
    ...noopDeps(),
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
