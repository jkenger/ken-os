import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  JOBSTREET_GRAPHQL_URL,
  JOBSTREET_SEARCH_URL,
  jobStreetDetailsRequestBody,
  jobStreetSearchUrl,
  parseJobStreetDetails,
  parseJobStreetSearch,
} from "./jobstreet";

const searchFixture = readFileSync(join(import.meta.dirname, "fixtures/jobstreet-search.json"), "utf8");
const detailsFixture = readFileSync(join(import.meta.dirname, "fixtures/jobstreet-details.json"), "utf8");

test("parses every result in a saved sample PH search response", () => {
  const postings = parseJobStreetSearch(searchFixture);
  assert.equal(postings.length, 20);
});

test("maps title, company, location, link and an id-based sourceId", () => {
  const [first] = parseJobStreetSearch(searchFixture);
  assert.equal(first.source, "jobstreet");
  assert.equal(first.sourceId, "js-95987372");
  assert.equal(first.title, "Software Engineer (.Net) | with Banking background | Onsite");
  assert.equal(first.company, "NCS Philippines");
  assert.equal(first.location, "Makati City, Metro Manila");
  assert.equal(first.link, "https://ph.jobstreet.com/job/95987372");
});

test("maps the listing date to postedAt as an ISO timestamp", () => {
  const [first] = parseJobStreetSearch(searchFixture);
  assert.equal(first.postedAt, "2026-11-19T03:30:17Z");
});

test("has no inline description -- snippet is empty, left for a separate detail fetch", () => {
  const [first] = parseJobStreetSearch(searchFixture);
  assert.equal(first.snippet, "");
  assert.equal(first.descriptionHtml, null);
});

test("a result with no companyName falls back to the advertiser's own description", () => {
  const raw = JSON.stringify({
    data: [
      {
        id: "1",
        title: "Role",
        advertiser: { description: "Acme Recruiting" },
        locations: [{ label: "Remote" }],
        listingDate: "2026-01-01T00:00:00Z",
      },
    ],
  });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.company, "Acme Recruiting");
});

test("a result missing a title is skipped, not thrown on", () => {
  const broken = JSON.stringify({ data: [{ id: "1", locations: [{ label: "Remote" }] }] });
  assert.deepEqual(parseJobStreetSearch(broken), []);
});

test("a result missing an id, even with a title present, is skipped, not thrown on", () => {
  const broken = JSON.stringify({ data: [{ title: "Role", locations: [{ label: "Remote" }] }] });
  assert.deepEqual(parseJobStreetSearch(broken), []);
});

test("malformed JSON parses to an empty list, not a thrown error", () => {
  assert.deepEqual(parseJobStreetSearch("not json"), []);
  assert.deepEqual(parseJobStreetSearch(JSON.stringify({ data: null })), []);
});

test("id and title trim surrounding whitespace", () => {
  const raw = JSON.stringify({ data: [{ id: "  1  ", title: "  Role  " }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.sourceId, "js-1");
  assert.equal(posting.title, "Role");
});

test("companyName trims surrounding whitespace", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role", companyName: "  Acme  " }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.company, "Acme");
});

test("the advertiser's own description trims surrounding whitespace", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role", advertiser: { description: "  Acme  " } }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.company, "Acme");
});

test("a result with no companyName and no advertiser at all maps company to an empty string, never thrown on", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role" }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.company, "");
});

test("an advertiser present but stating no description maps company to an empty string, not thrown on", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role", advertiser: {} }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.company, "");
});

test("a result with no locations at all maps location to an empty string", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role" }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.location, "");
});

test("a result with an empty locations array maps location to an empty string", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role", locations: [] }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.location, "");
});

test("a locations entry with no label maps location to an empty string, not thrown on", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role", locations: [{}] }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.location, "");
});

test("the first location's label trims surrounding whitespace", () => {
  const raw = JSON.stringify({ data: [{ id: "1", title: "Role", locations: [{ label: "  Remote  " }] }] });
  const [posting] = parseJobStreetSearch(raw);
  assert.equal(posting.location, "Remote");
});

test("builds the PH search URL with siteKey, keywords, a page number and a page size", () => {
  const url = jobStreetSearchUrl("Full-Stack Engineer", 1);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, JOBSTREET_SEARCH_URL);
  assert.equal(parsed.searchParams.get("siteKey"), "PH-Main");
  assert.equal(parsed.searchParams.get("keywords"), "Full-Stack Engineer");
  assert.equal(parsed.searchParams.get("page"), "1");
  assert.equal(parsed.searchParams.get("pageSize"), "20");
});

test("the GraphQL endpoint is SEEK's own, not a guess", () => {
  assert.equal(JOBSTREET_GRAPHQL_URL, "https://au.seek.com/graphql");
});

test("builds a single-id batched GraphQL details request with the PH zone", () => {
  const body = jobStreetDetailsRequestBody("95987372");
  assert.ok(body.query.includes('j95987372: jobDetails(id: "95987372")'));
  assert.deepEqual(body.variables, { zone: "asia-6" });
});

test("extracts a job's description HTML off a saved sample details response, by id", () => {
  const html = parseJobStreetDetails(detailsFixture, "95987372");
  assert.ok(html!.includes("<p>"), "HTML tags are preserved");
  assert.ok(html!.includes("NCS is a leading AI Tech Services company"));
});

test("an id not present in the response parses to null, never guessed", () => {
  assert.equal(parseJobStreetDetails(detailsFixture, "does-not-exist"), null);
});

test("malformed JSON from the details endpoint parses to null, not a thrown error", () => {
  assert.equal(parseJobStreetDetails("not json", "95987372"), null);
});

test("a matching id with no job object at all parses to null, not thrown on", () => {
  const raw = JSON.stringify({ data: { j1: {} } });
  assert.equal(parseJobStreetDetails(raw, "1"), null);
});

test("a matching id whose job states no content parses to null, not thrown on", () => {
  const raw = JSON.stringify({ data: { j1: { job: {} } } });
  assert.equal(parseJobStreetDetails(raw, "1"), null);
});

test("the description's surrounding whitespace is trimmed off", () => {
  const raw = JSON.stringify({ data: { j1: { job: { content: "  <p>Text.</p>  " } } } });
  assert.equal(parseJobStreetDetails(raw, "1"), "<p>Text.</p>");
});
