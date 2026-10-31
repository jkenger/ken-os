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
  overrides: Partial<{
    id: string;
    title: string;
    company: string;
    location: string;
    snippet: string;
    sourceCountries: string[] | null;
    sourceWorkMode: "remote" | "hybrid" | "onsite" | null;
    sourceEmploymentType: string | null;
    sourceSalaryMin: number | null;
    sourceSalaryMax: number | null;
    sourceSalaryCurrency: string | null;
    sourceSalaryPeriod: "hour" | "day" | "week" | "month" | "year" | null;
    sourceExperienceYearsMin: number | null;
  }> = {},
) {
  return {
    id: "posting-1",
    title: "Senior Engineer",
    company: "Acme",
    location: "Remote",
    snippet: "A snippet.",
    sourceCountries: [],
    sourceWorkMode: null,
    sourceEmploymentType: null,
    sourceSalaryMin: null,
    sourceSalaryMax: null,
    sourceSalaryCurrency: null,
    sourceSalaryPeriod: null,
    sourceExperienceYearsMin: null,
    ...overrides,
  };
}

function noopDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    getPending: async () => [] as ReturnType<typeof pendingPosting>[],
    extract: async () => extractResult,
    saveExtracted: async () => {},
  };
}

test("a correct secret processes each pending posting, using its own snippet as the full description", async () => {
  const saved: unknown[] = [];
  const result = await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ snippet: "The posting's own full text." })],
    saveExtracted: async (postingId, fields) => {
      saved.push({ postingId, fields });
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.processed, 1);
  const [saved0] = saved as [{ postingId: string; fields: Record<string, unknown> }];
  assert.equal(saved0.postingId, "posting-1");
  assert.equal(saved0.fields.fullDescription, "The posting's own full text.");
  assert.equal(saved0.fields.partial, false);
  assert.equal(saved0.fields.summary, "A senior role.");
  assert.equal(saved0.fields.payAmount, 140000);
  assert.equal(saved0.fields.extractPromptVersion, "jobs-extract-v1");
  assert.equal(saved0.fields.extractModel, "test-model");
});

test("a posting with no snippet text is saved as Partial", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ snippet: "" })],
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ fullDescription: string | null; partial: boolean }];
  assert.equal(savedFields.fullDescription, null);
  assert.equal(savedFields.partial, true);
});

test("extract receives the posting's title, company, location and text as distinct data fields", async () => {
  const calls: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ snippet: "Full text here." })],
    extract: async (input) => {
      calls.push(input);
      return extractResult;
    },
  });
  assert.deepEqual(calls, [{ title: "Senior Engineer", company: "Acme", location: "Remote", text: "Full text here." }]);
});

test("a posting with freehire-stated countries saves eligibilityStated true and those codes directly, regardless of what extract returns", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceCountries: ["ph", "us"] })],
    extract: async () => ({ ...extractResult, eligibilityStated: false, countries: [] }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ eligibilityStated: boolean; countries: string[] }];
  assert.equal(savedFields.eligibilityStated, true);
  assert.deepEqual(savedFields.countries, ["PH", "US"]);
});

test("a posting with no freehire-stated countries falls back to whatever extract returns", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceCountries: [] })],
    extract: async () => ({ ...extractResult, eligibilityStated: true, countries: ["GB"] }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ eligibilityStated: boolean; countries: string[] }];
  assert.equal(savedFields.eligibilityStated, true);
  assert.deepEqual(savedFields.countries, ["GB"]);
});

test("a posting with a freehire-stated work mode saves workSetup directly, mapping onsite to on_site", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceWorkMode: "onsite" })],
    extract: async () => ({ ...extractResult, workSetup: "remote" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ workSetup: string | null }];
  assert.equal(savedFields.workSetup, "on_site");
});

test("a posting with no freehire-stated work mode falls back to whatever extract returns", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceWorkMode: null })],
    extract: async () => ({ ...extractResult, workSetup: "hybrid" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ workSetup: string | null }];
  assert.equal(savedFields.workSetup, "hybrid");
});

test("a posting with a freehire-stated employment type saves jobType directly", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceEmploymentType: "contract" })],
    extract: async () => ({ ...extractResult, jobType: "full_time" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ jobType: string | null }];
  assert.equal(savedFields.jobType, "contract");
});

test("a posting with no freehire-stated employment type falls back to whatever extract returns", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceEmploymentType: null })],
    extract: async () => ({ ...extractResult, jobType: "internship" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ jobType: string | null }];
  assert.equal(savedFields.jobType, "internship");
});

test("a posting with freehire-stated min and max salary saves the midpoint, currency and period directly", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [
      pendingPosting({
        sourceSalaryMin: 84000,
        sourceSalaryMax: 95000,
        sourceSalaryCurrency: "USD",
        sourceSalaryPeriod: "year",
      }),
    ],
    extract: async () => ({ ...extractResult, payAmount: 1, payCurrency: "EUR", payPeriod: "month" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ payAmount: number | null; payCurrency: string | null; payPeriod: string | null }];
  assert.equal(savedFields.payAmount, 89500, "midpoint of 84000 and 95000");
  assert.equal(savedFields.payCurrency, "USD");
  assert.equal(savedFields.payPeriod, "year");
});

test("a posting with only a freehire-stated min salary (no max) saves that figure directly", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [
      pendingPosting({
        sourceSalaryMin: 60000,
        sourceSalaryMax: null,
        sourceSalaryCurrency: "USD",
        sourceSalaryPeriod: "year",
      }),
    ],
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ payAmount: number | null }];
  assert.equal(savedFields.payAmount, 60000);
});

test("a posting with no freehire-stated salary falls back to whatever extract returns", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceSalaryMin: null, sourceSalaryMax: null })],
    extract: async () => ({ ...extractResult, payAmount: 1, payCurrency: "EUR", payPeriod: "month" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ payAmount: number | null; payCurrency: string | null; payPeriod: string | null }];
  assert.equal(savedFields.payAmount, 1);
  assert.equal(savedFields.payCurrency, "EUR");
  assert.equal(savedFields.payPeriod, "month");
});

test("a posting with a freehire-stated minimum experience saves yearsRequired directly", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceExperienceYearsMin: 3 })],
    extract: async () => ({ ...extractResult, yearsRequired: 10 }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ yearsRequired: number | null }];
  assert.equal(savedFields.yearsRequired, 3);
});

test("a posting with no freehire-stated minimum experience falls back to whatever extract returns", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting({ sourceExperienceYearsMin: null })],
    extract: async () => ({ ...extractResult, yearsRequired: 10 }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ yearsRequired: number | null }];
  assert.equal(savedFields.yearsRequired, 10);
});

test("seniority always comes from extract, never overridden by freehire", async () => {
  const saved: unknown[] = [];
  await processPostings({
    ...noopDeps(),
    getPending: async () => [pendingPosting()],
    extract: async () => ({ ...extractResult, seniority: "lead" }),
    saveExtracted: async (postingId, fields) => {
      saved.push(fields);
    },
  });
  const [savedFields] = saved as [{ seniority: string | null }];
  assert.equal(savedFields.seniority, "lead");
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
