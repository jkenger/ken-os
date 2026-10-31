import assert from "node:assert/strict";
import { test } from "node:test";
import { processPostings, scorePostings } from "./process";

const extractResult = {
  payAmount: 140000,
  payCurrency: "USD",
  payPeriod: "year" as const,
  jobType: "full_time" as const,
  workSetup: "remote" as const,
  eligibilityStated: false,
  countries: [],
  requiredHours: null,
  seniority: "senior" as const,
  yearsRequired: 5,
  isAgency: false,
  summary: "A senior role.",
  promptVersion: "jobs-extract-v1",
  model: "test-model",
};

function pendingPosting(
  overrides: Partial<{ id: string; title: string; company: string; location: string; snippet: string }> = {},
) {
  return {
    id: "posting-1",
    title: "Senior Engineer",
    company: "Acme",
    location: "Remote",
    snippet: "A snippet.",
    sources: [{ source: "linkedin" as const, link: "https://www.linkedin.com/jobs/view/1" }],
    ...overrides,
  };
}

function noopDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    getPending: async () => [] as ReturnType<typeof pendingPosting>[],
    readFullPosting: async () => null,
    extract: async () => extractResult,
    saveExtracted: async () => {},
  };
}

test("a correct secret processes each pending posting and saves what it reads and extracts", async () => {
  const saved: unknown[] = [];
  const result = await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting()],
    readFullPosting: async () => "The full description text.",
    saveExtracted: async (postingId, fields) => {
      saved.push({ postingId, fields });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.processed, 1);
  const [saved0] = saved as [{ postingId: string; fields: Record<string, unknown> }];
  assert.equal(saved0.postingId, "posting-1");
  assert.equal(saved0.fields.fullDescription, "The full description text.");
  assert.equal(saved0.fields.partial, false);
  assert.equal(saved0.fields.summary, "A senior role.");
  assert.equal(saved0.fields.payAmount, 140000);
  assert.equal(saved0.fields.extractPromptVersion, "jobs-extract-v1");
  assert.equal(saved0.fields.extractModel, "test-model");
});

test("a posting whose full read fails everywhere is saved as Partial, still extracted from list fields", async () => {
  const saved: unknown[] = [];
  const extractCalls: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting()],
    readFullPosting: async () => null,
    extract: async (input) => {
      extractCalls.push(input);
      return extractResult;
    },
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ fullDescription: string | null; partial: boolean }];
  assert.equal(savedFields.fullDescription, null);
  assert.equal(savedFields.partial, true);
  const [call] = extractCalls as [{ text: string }];
  assert.equal(call.text, "A snippet.", "extract runs on the snippet when there's no full description");
});

test("readFullPosting is called with the posting's own sources", async () => {
  const seenSources: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ id: "p1" })],
    readFullPosting: async (sources) => {
      seenSources.push(sources);
      return null;
    },
  });
  assert.deepEqual(seenSources, [[{ source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" }]]);
});

test("extract receives the posting's title, company, location and text as distinct data fields", async () => {
  const calls: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting()],
    readFullPosting: async () => "Full text here.",
    extract: async (input) => {
      calls.push(input);
      return extractResult;
    },
  });
  assert.deepEqual(calls, [{ title: "Senior Engineer", company: "Acme", location: "Remote", text: "Full text here." }]);
});

test("a wrong secret is rejected and nothing is fetched or saved", async () => {
  let pendingFetched = false;
  const result = await processPostings({
    ...noopDeps(),
    secret: "wrong",
    getPending: async () => {
      pendingFetched = true;
      return [];
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad secret");
  assert.equal(pendingFetched, false);
});

test("requests at most 5 pending postings", async () => {
  const limits: number[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async (limit) => {
      limits.push(limit);
      return [];
    },
  });
  assert.deepEqual(limits, [5]);
});

test("nothing pending succeeds and processes nothing", async () => {
  const result = await processPostings(noopDeps());
  assert.equal(result.ok, true);
  assert.equal(result.processed, 0);
});

test("processes every posting getPending returns, in order", async () => {
  const processedIds: string[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ id: "p1" }), pendingPosting({ id: "p2" })],
    saveExtracted: async (postingId) => {
      processedIds.push(postingId);
    },
  });
  assert.deepEqual(processedIds, ["p1", "p2"]);
});

const scoreResult = {
  score: 82,
  whyFits: [{ reason: "5 years of backend experience matches the role's seniority", citation: "5+ years required" }],
  whatsMissing: ["No mention of Kubernetes"],
  promptVersion: "jobs-score-v1",
  model: "test-model",
};

function scorablePosting(
  overrides: Partial<{
    id: string;
    title: string;
    company: string;
    fullDescription: string | null;
    summary: string;
  }> = {},
) {
  return {
    id: "posting-1",
    title: "Senior Engineer",
    company: "Acme",
    fullDescription: "The full description text.",
    summary: "A senior role.",
    ...overrides,
  };
}

function noopScoreDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    getNeedingScore: async () => [] as ReturnType<typeof scorablePosting>[],
    getProfileForScoring: async () => ({ profile: { headline: "Engineer" }, version: null as Date | null }),
    score: async () => scoreResult,
    saveScore: async () => {},
  };
}

test("a correct secret scores each posting needing a score and saves the result", async () => {
  const saved: unknown[] = [];
  const result = await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async () => [scorablePosting()],
    saveScore: async (postingId, fields) => {
      saved.push({ postingId, fields });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.processed, 1);
  const [saved0] = saved as [{ postingId: string; fields: Record<string, unknown> }];
  assert.equal(saved0.postingId, "posting-1");
  assert.equal(saved0.fields.score, 82);
  assert.deepEqual(saved0.fields.whyFits, scoreResult.whyFits);
  assert.deepEqual(saved0.fields.whatsMissing, scoreResult.whatsMissing);
  assert.equal(saved0.fields.scorePromptVersion, "jobs-score-v1");
});

test("saveScore gets the Profile's version from getProfileForScoring, for later staleness checks", async () => {
  const saved: unknown[] = [];
  const version = new Date("2026-10-01T00:00:00Z");
  await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async () => [scorablePosting()],
    getProfileForScoring: async () => ({ profile: {}, version }),
    saveScore: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [fields] = saved as [{ profileVersionScored: Date | null }];
  assert.equal(fields.profileVersionScored, version);
});

test("score is called with the full description when there is one", async () => {
  const calls: unknown[] = [];
  await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async () => [scorablePosting({ fullDescription: "Full text.", summary: "A summary." })],
    score: async (input) => {
      calls.push(input);
      return scoreResult;
    },
  });
  const [call] = calls as [{ text: string }];
  assert.equal(call.text, "Full text.");
});

test("score falls back to the summary for a Partial posting with no full description", async () => {
  const calls: unknown[] = [];
  await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async () => [scorablePosting({ fullDescription: null, summary: "A summary." })],
    score: async (input) => {
      calls.push(input);
      return scoreResult;
    },
  });
  const [call] = calls as [{ text: string }];
  assert.equal(call.text, "A summary.");
});

test("score receives the posting's title, company, text and the Profile as distinct data fields", async () => {
  const calls: unknown[] = [];
  const profile = { headline: "Engineer" };
  await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async () => [scorablePosting()],
    getProfileForScoring: async () => ({ profile, version: null }),
    score: async (input) => {
      calls.push(input);
      return scoreResult;
    },
  });
  assert.deepEqual(calls, [{ profile, title: "Senior Engineer", company: "Acme", text: "The full description text." }]);
});

test("a wrong secret is rejected and nothing is scored", async () => {
  let fetched = false;
  const result = await scorePostings({
    ...noopScoreDeps(),
    secret: "wrong",
    getNeedingScore: async () => {
      fetched = true;
      return [];
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad secret");
  assert.equal(fetched, false);
});

test("requests at most 5 postings needing a score", async () => {
  const limits: number[] = [];
  await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async (limit) => {
      limits.push(limit);
      return [];
    },
  });
  assert.deepEqual(limits, [5]);
});

test("nothing needing a score succeeds, processes nothing, and never fetches the Profile", async () => {
  let profileFetched = false;
  const result = await scorePostings({
    ...noopScoreDeps(),
    getProfileForScoring: async () => {
      profileFetched = true;
      return { profile: {}, version: null };
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.processed, 0);
  assert.equal(profileFetched, false);
});

test("scores every posting getNeedingScore returns, in order", async () => {
  const scoredIds: string[] = [];
  await scorePostings({
    ...noopScoreDeps(),
    getNeedingScore: async () => [scorablePosting({ id: "p1" }), scorablePosting({ id: "p2" })],
    saveScore: async (postingId) => {
      scoredIds.push(postingId);
    },
  });
  assert.deepEqual(scoredIds, ["p1", "p2"]);
});
