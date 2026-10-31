import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { freehireSearchUrl, parseFreehireSearch } from "./freehire";

const fixture = readFileSync(join(import.meta.dirname, "fixtures/freehire-search.json"), "utf8");

test("parses every result in a saved sample search response", () => {
  const postings = parseFreehireSearch(fixture);
  assert.equal(postings.length, 5);
});

test("maps title, company, location, link and a public_slug-based sourceId", () => {
  const [first] = parseFreehireSearch(fixture);
  assert.equal(first.source, "freehire");
  assert.equal(first.sourceId, "fh-software-engineer-nando-s-chickenland-limited-gytczycz");
  assert.equal(first.title, "Software Engineer");
  assert.equal(first.company, "Nando’s Chickenland Limited");
  assert.equal(first.location, "United Kingdom");
  assert.equal(
    first.link,
    "https://uk.whatjobs.com/pub_api__cpl__593046486__7082?utm_campaign=publisher&utm_medium=api&utm_source=freehire.me",
  );
});

test("the HTML description decodes to plain text in the snippet", () => {
  const [first] = parseFreehireSearch(fixture);
  assert.ok(first.snippet.includes("Help our engineers spend more time building great experiences"));
  assert.ok(!first.snippet.includes("<p>"), "no HTML tags remain");
  assert.ok(!first.snippet.includes("&amp;"), "no unescaped entities remain");
});

test("malformed JSON parses to an empty list, not a thrown error", () => {
  assert.deepEqual(parseFreehireSearch("not json"), []);
  assert.deepEqual(parseFreehireSearch(JSON.stringify({ data: null })), []);
});

test("a result missing a title or url is skipped, not thrown on", () => {
  const broken = JSON.stringify({
    data: [{ public_slug: "x", title: "", company: "Acme", location: "Remote", description: "", url: "" }],
  });
  assert.deepEqual(parseFreehireSearch(broken), []);
});

test("builds the search URL with the keyword, freshness window and limit", () => {
  const url = freehireSearchUrl("Senior Backend Engineer", 3, 20);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, "https://freehire.me/api/v1/jobs/search");
  assert.equal(parsed.searchParams.get("q"), "Senior Backend Engineer");
  assert.equal(parsed.searchParams.get("posted_within_days"), "3");
  assert.equal(parsed.searchParams.get("limit"), "20");
});
