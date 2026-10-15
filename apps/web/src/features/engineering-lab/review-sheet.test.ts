import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSheet, reviewSheetInput, searchReviews, type ReviewSheet } from "./review-sheet";

// A topic's review sheet (docs/architecture/engineering-claude-first.md, section 9h): Claude writes one per topic,
// organised by its points, and the owner searches every sheet and note by term.

const point = (pointId: string, extra: Partial<ReviewSheet["points"][number]> = {}) => ({
  pointId,
  question: `What does ${pointId} cover?`,
  explanation: "A state update asks React to render again with the new value.",
  example: "setCount((count) => count + 1);",
  mistake: "Reading the state right after setting it and expecting the new value.",
  ...extra,
});

const sheet = (points = [point("p1"), point("p2")]) => ({
  points,
  terms: [{ term: "Updater function", meaning: "A function you pass to setState that gets the previous value." }],
});

test("a sheet has a question, an explanation, an example and a mistake for each point, and short terms", () => {
  assert.equal(reviewSheetInput.safeParse(sheet()).success, true);
  assert.equal(reviewSheetInput.safeParse(sheet([point("p1", { example: "" })])).success, false, "needs an example");
  assert.equal(reviewSheetInput.safeParse(sheet([point("p1", { question: "" })])).success, false, "needs a question");
  assert.equal(reviewSheetInput.safeParse(sheet([point("p1", { pointId: "one" })])).success, false, "ids are p1, p2");
  assert.equal(
    reviewSheetInput.safeParse({ ...sheet(), terms: [{ term: "x".repeat(81), meaning: "y" }] }).success,
    false,
    "a term is a name, not a sentence",
  );
  assert.equal(reviewSheetInput.safeParse({ ...sheet(), extra: true }).success, false);
  const parsed = reviewSheetInput.parse(sheet());
  assert.equal(parsed.points[0].ownMistake, false, "a mistake is generic unless Claude says the owner made it");
});

test("a sheet covers every point of the topic once, and comes back in point order", () => {
  const parsed = (points: ReturnType<typeof point>[]) => reviewSheetInput.parse(sheet(points));
  assert.deepEqual(
    checkSheet(2, parsed([point("p2"), point("p1")])).points.map((item) => item.pointId),
    ["p1", "p2"],
  );
  assert.throws(() => checkSheet(3, parsed([point("p1"), point("p2")])), /p3/);
  assert.throws(() => checkSheet(2, parsed([point("p1"), point("p1"), point("p2")])), /twice/);
  assert.throws(() => checkSheet(2, parsed([point("p1"), point("p2"), point("p3")])), /p3/);
});

test("search finds a term across sheets and notes, terms first, ignoring case", () => {
  const entries = [
    {
      topicId: "react.state",
      title: "State",
      sheet: checkSheet(2, reviewSheetInput.parse(sheet())),
      notes: [{ id: "n1", body: "Say updater function, not callback" }],
    },
    {
      topicId: "react.lists",
      title: "Lists",
      sheet: null,
      notes: [{ id: "n2", body: "A key tells React which item is which" }],
    },
  ];
  const hits = searchReviews(entries, "UPDATER function");
  assert.deepEqual(
    hits.map((hit) => [hit.topicId, hit.where]),
    [
      ["react.state", "term"],
      ["react.state", "note"],
    ],
  );
  assert.equal(hits[0].label, "Updater function");
  assert.deepEqual(
    searchReviews(entries, "key").map((hit) => hit.topicId),
    ["react.lists"],
  );
  assert.deepEqual(
    searchReviews(entries, "count + 1").map((hit) => [hit.where, hit.label]),
    [
      ["point", "p1"],
      ["point", "p2"],
    ],
    "examples are searchable too",
  );
  assert.deepEqual(searchReviews(entries, " k "), [], "one letter matches everything, so it matches nothing");
});
