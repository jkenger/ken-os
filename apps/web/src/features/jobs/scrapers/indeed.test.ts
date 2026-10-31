import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { indeedSearchBody, isIndeedSearchError, parseIndeedSearch } from "./indeed";

const fixture = readFileSync(join(import.meta.dirname, "fixtures/indeed-search.json"), "utf8");

test("parses every job in a saved search response", () => {
  const postings = parseIndeedSearch(fixture);
  assert.equal(postings.length, 2);
});

test("extracts title, company, location and a source ID from the job's own key", () => {
  const [first] = parseIndeedSearch(fixture);
  assert.deepEqual(first, {
    source: "indeed",
    sourceId: "in-abc123indeed",
    title: "Senior Backend Engineer",
    company: "Acme Inc",
    location: "Austin, TX",
    snippet: "",
    link: "https://www.indeed.com/viewjob?jk=abc123indeed",
  });
});

test("falls back to the source employer name when the employer object is missing", () => {
  const [, second] = parseIndeedSearch(fixture);
  assert.equal(second.company, "Northwind Labs");
});

test("a response with no results parses to an empty list, not an error", () => {
  assert.deepEqual(parseIndeedSearch(JSON.stringify({ data: { jobSearch: { results: [] } } })), []);
});

test("a malformed response parses to an empty list, not a thrown error", () => {
  assert.deepEqual(parseIndeedSearch("not json"), []);
  assert.deepEqual(parseIndeedSearch(JSON.stringify({ data: null })), []);
});

test("builds the GraphQL request body with the keyword and a 24-hour freshness filter", () => {
  const body = JSON.parse(indeedSearchBody("Senior Backend Engineer"));
  assert.ok(body.query.includes('what: "Senior Backend Engineer"'));
  assert.ok(body.query.includes('start: "24h"'));
});

test("a saved sample response and a genuinely empty result list are not errors", () => {
  assert.equal(isIndeedSearchError(fixture), false);
  assert.equal(isIndeedSearchError(JSON.stringify({ data: { jobSearch: { results: [] } } })), false);
});

test("unparsable text, a GraphQL errors array, or missing data is an error", () => {
  assert.equal(isIndeedSearchError("not json"), true);
  assert.equal(isIndeedSearchError(JSON.stringify({ errors: [{ message: "rate limited" }] })), true);
  assert.equal(isIndeedSearchError(JSON.stringify({ data: null })), true);
  assert.equal(isIndeedSearchError(JSON.stringify({ data: {} })), true);
});
