import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { linkedInSearchUrl, parseLinkedInSearch } from "./linkedin";

const fixture = readFileSync(join(import.meta.dirname, "fixtures/linkedin-search.html"), "utf8");

test("parses every job card in a saved search response", () => {
  const postings = parseLinkedInSearch(fixture);
  assert.equal(postings.length, 2);
});

test("extracts title, company, location and a source ID from the card's own entity URN", () => {
  const [first] = parseLinkedInSearch(fixture);
  assert.deepEqual(first, {
    source: "linkedin",
    sourceId: "li-3912345671",
    title: "Senior Frontend Engineer",
    company: "Acme Inc",
    location: "Remote, United States",
    snippet: "",
    link: "https://www.linkedin.com/jobs/view/3912345671",
  });
});

test("a response with no job cards parses to an empty list, not an error", () => {
  assert.deepEqual(parseLinkedInSearch("<html><body>No jobs today</body></html>"), []);
});

test("a card missing its title or entity URN is skipped, not thrown on", () => {
  const html = `<div class="base-search-card" data-entity-urn="urn:li:jobPosting:1"></div>`;
  assert.deepEqual(parseLinkedInSearch(html), []);
});

test("builds the guest search URL with the keyword as the query", () => {
  assert.equal(
    linkedInSearchUrl("Senior Frontend Engineer"),
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=Senior+Frontend+Engineer",
  );
});
