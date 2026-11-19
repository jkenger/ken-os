import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { linkedInDetailUrl, linkedInSearchUrl, parseLinkedInDescription, parseLinkedInSearch } from "./linkedin";

const searchFixture = readFileSync(join(import.meta.dirname, "fixtures/linkedin-search.html"), "utf8");
const detailFixture = readFileSync(join(import.meta.dirname, "fixtures/linkedin-detail.html"), "utf8");

test("parses every card in a saved sample guest-search page", () => {
  const postings = parseLinkedInSearch(searchFixture);
  assert.equal(postings.length, 10);
});

test("maps title, company, location, link and an entity-urn-based sourceId", () => {
  const [first] = parseLinkedInSearch(searchFixture);
  assert.equal(first.source, "linkedin");
  assert.equal(first.sourceId, "li-4485352110");
  assert.equal(first.title, "Full-Stack Developer (C# & ReactJS)");
  assert.equal(first.company, "EviSmart™");
  assert.equal(first.location, "Taguig, National Capital Region, Philippines");
  assert.ok(first.link.startsWith("https://ph.linkedin.com/jobs/view/"));
});

test("has no inline description -- snippet is empty, left for a separate detail fetch", () => {
  const [first] = parseLinkedInSearch(searchFixture);
  assert.equal(first.snippet, "");
  assert.equal(first.descriptionHtml, null);
});

test("maps the listing date to postedAt as an ISO date", () => {
  const [first] = parseLinkedInSearch(searchFixture);
  assert.equal(first.postedAt, "2026-10-30");
});

test("a card missing its data-entity-urn maps sourceId to null, never guessed", () => {
  const broken = `<div class="base-card base-search-card">
    <a class="base-card__full-link" href="https://example.com/job"></a>
    <h3 class="base-search-card__title">Role</h3>
    <h4 class="base-search-card__subtitle">Acme</h4>
    <span class="job-search-card__location">Remote</span>
  </div>`;
  const [posting] = parseLinkedInSearch(broken);
  assert.equal(posting.sourceId, null);
});

test("a card missing its title, even with a link present, is skipped, not thrown on", () => {
  const broken = `<div class="base-card base-search-card" data-entity-urn="urn:li:jobPosting:1">
    <a class="base-card__full-link" href="https://example.com/job"></a>
    <h4 class="base-search-card__subtitle">Acme</h4>
  </div>`;
  assert.deepEqual(parseLinkedInSearch(broken), []);
});

test("a card missing its link, even with a title present, is skipped, not thrown on", () => {
  const broken = `<div class="base-card base-search-card" data-entity-urn="urn:li:jobPosting:1">
    <h3 class="base-search-card__title">Role</h3>
  </div>`;
  assert.deepEqual(parseLinkedInSearch(broken), []);
});

test("title and link trim surrounding whitespace, the way LinkedIn's own markup indents them", () => {
  const card = `<div class="base-card base-search-card" data-entity-urn="urn:li:jobPosting:1">
    <a class="base-card__full-link" href="  https://example.com/job  "></a>
    <h3 class="base-search-card__title">
      Role
    </h3>
  </div>`;
  const [posting] = parseLinkedInSearch(card);
  assert.equal(posting.title, "Role");
  assert.equal(posting.link, "https://example.com/job");
});

test("malformed HTML parses to an empty list, not a thrown error", () => {
  assert.deepEqual(parseLinkedInSearch("not html at all"), []);
  assert.deepEqual(parseLinkedInSearch(""), []);
});

test("builds the guest search URL with keywords, location, posted-within filter and a start offset", () => {
  const url = linkedInSearchUrl("Full-Stack Engineer", 0);
  const parsed = new URL(url);
  assert.equal(
    parsed.origin + parsed.pathname,
    "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search",
  );
  assert.equal(parsed.searchParams.get("keywords"), "Full-Stack Engineer");
  assert.equal(parsed.searchParams.get("location"), "Philippines");
  assert.equal(parsed.searchParams.get("start"), "0");
});

test("the start offset moves by 10, one page at a time", () => {
  const url = linkedInSearchUrl("Full-Stack Engineer", 10);
  assert.equal(new URL(url).searchParams.get("start"), "10");
});

test("builds the one-job detail URL from a bare numeric id, no slug needed", () => {
  assert.equal(linkedInDetailUrl("4485352110"), "https://www.linkedin.com/jobs/view/4485352110");
});

test("extracts the full description's HTML off a saved sample job detail page", () => {
  const html = parseLinkedInDescription(detailFixture);
  assert.ok(html!.includes("<p>"), "HTML tags are preserved");
  assert.ok(html!.includes("We're not looking for developers who simply know how to code"));
});

test("a detail page with no description section parses to null, never guessed", () => {
  assert.equal(parseLinkedInDescription("<html><body>no job here</body></html>"), null);
});

test("the description's surrounding whitespace is trimmed off", () => {
  const html = `<div class="show-more-less-html__markup">
    <p>Text.</p>
  </div>`;
  assert.equal(parseLinkedInDescription(html), "<p>Text.</p>");
});
