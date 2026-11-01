import assert from "node:assert/strict";
import { test } from "node:test";
import { sortPostings } from "./sort-postings";

type TestPosting = {
  id: string;
  score: number | null;
  payAmount: number | null;
  sourcePostedAt: Date | null;
  firstSeenAt: Date;
};

function posting(overrides: Partial<TestPosting>): TestPosting {
  return {
    id: "p1",
    score: null,
    payAmount: null,
    sourcePostedAt: null,
    firstSeenAt: new Date("2026-10-01T00:00:00Z"),
    ...overrides,
  };
}

test("score, high to low: a null score sorts last, never thrown as a comparison error", () => {
  const result = sortPostings(
    [posting({ id: "a", score: 50 }), posting({ id: "b", score: null }), posting({ id: "c", score: 90 })],
    "score",
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ["c", "a", "b"],
  );
});

test("newest first: prefers the source's own posted date over when we first saw it", () => {
  const result = sortPostings(
    [
      posting({ id: "old", sourcePostedAt: new Date("2026-10-01T00:00:00Z") }),
      posting({ id: "new", sourcePostedAt: new Date("2026-10-30T00:00:00Z") }),
      posting({ id: "no-source-date", sourcePostedAt: null, firstSeenAt: new Date("2026-10-15T00:00:00Z") }),
    ],
    "newest",
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ["new", "no-source-date", "old"],
  );
});

test("pay, high to low: a null payAmount sorts last", () => {
  const result = sortPostings(
    [
      posting({ id: "a", payAmount: 1000 }),
      posting({ id: "b", payAmount: null }),
      posting({ id: "c", payAmount: 2000 }),
    ],
    "pay",
  );
  assert.deepEqual(
    result.map((p) => p.id),
    ["c", "a", "b"],
  );
});

test("the input array is never mutated", () => {
  const input = [posting({ id: "a", score: 1 }), posting({ id: "b", score: 2 })];
  const copy = [...input];
  sortPostings(input, "score");
  assert.deepEqual(input, copy);
});
