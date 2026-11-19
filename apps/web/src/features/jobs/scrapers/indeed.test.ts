import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { INDEED_HEADERS, indeedSearchQuery, indeedSearchUrl, parseIndeedSearch } from "./indeed";

const fixture = readFileSync(join(import.meta.dirname, "fixtures/indeed-search.json"), "utf8");

test("parses every result in a saved sample GraphQL response", () => {
  const postings = parseIndeedSearch(fixture);
  assert.equal(postings.length, 6);
});

test("maps title, company, link and a job-key-based sourceId off the first result", () => {
  const [first] = parseIndeedSearch(fixture);
  assert.equal(first.source, "indeed");
  assert.equal(first.sourceId, "in-27ec74e821a6dce5");
  assert.equal(first.title, "Full Stack Developer");
  assert.equal(first.company, "HomeTeam Live Technologies Corp.");
  assert.equal(first.location, "Cebu City");
  assert.equal(first.link, "http://ph.indeed.com/job/full-stack-developer-27ec74e821a6dce5");
});

test("a result with an external apply link uses that link directly, not a constructed Indeed URL", () => {
  const postings = parseIndeedSearch(fixture);
  const external = postings.find((p) => p.company === "True North Insights")!;
  assert.equal(external.link, "https://grnh.se/xvqja5cl3us");
});

test("a result with no employer.name falls back to sourceEmployerName", () => {
  const postings = parseIndeedSearch(fixture);
  const fallback = postings.find((p) => p.sourceId === "in-ea372297e2cf2b18")!;
  assert.equal(fallback.company, "BERNY TECHNOLOGIES PTY LTD");
});

test("the description's HTML decodes to plain text in the snippet, the raw HTML kept separately", () => {
  const [first] = parseIndeedSearch(fixture);
  assert.ok(first.snippet.includes("HTN is a Canadian-headquartered sports technology company"));
  assert.ok(!first.snippet.includes("<p>"), "no HTML tags remain in the plain-text snippet");
  assert.ok(first.descriptionHtml!.includes("<p>"), "HTML tags are preserved in descriptionHtml");
});

test("maps dateOnIndeed, an epoch-millisecond timestamp, to an ISO postedAt", () => {
  const [first] = parseIndeedSearch(fixture);
  assert.equal(first.postedAt, new Date(1790372686453).toISOString());
});

test("a result missing a title or key is skipped, not thrown on", () => {
  const broken = JSON.stringify({
    data: { jobSearch: { results: [{ job: { key: "x", title: "", description: { html: "" } } }] } },
  });
  assert.deepEqual(parseIndeedSearch(broken), []);
});

test("a key or title present as undefined, not just empty, is still skipped, not thrown on", () => {
  const broken = JSON.stringify({
    data: { jobSearch: { results: [{ job: { title: "Role" } }, { job: { key: "x" } }] } },
  });
  assert.deepEqual(parseIndeedSearch(broken), []);
});

test("title and key trim surrounding whitespace", () => {
  const padded = JSON.stringify({
    data: { jobSearch: { results: [{ job: { key: "  abc123  ", title: "  Role  " } }] } },
  });
  const [posting] = parseIndeedSearch(padded);
  assert.equal(posting.sourceId, "in-abc123");
  assert.equal(posting.title, "Role");
});

test("a null job entry among results is skipped, not thrown on", () => {
  const response = JSON.stringify({
    data: { jobSearch: { results: [{ job: null }, { job: { key: "x", title: "Role" } }] } },
  });
  const postings = parseIndeedSearch(response);
  assert.equal(postings.length, 1);
  assert.equal(postings[0].sourceId, "in-x");
});

test("company, location and description trim surrounding whitespace", () => {
  const padded = JSON.stringify({
    data: {
      jobSearch: {
        results: [
          {
            job: {
              key: "x",
              title: "Role",
              employer: { name: "  Acme  " },
              location: { city: "  Manila  " },
              description: { html: "  <p>Text.</p>  " },
            },
          },
        ],
      },
    },
  });
  const [posting] = parseIndeedSearch(padded);
  assert.equal(posting.company, "Acme");
  assert.equal(posting.location, "Manila");
  assert.equal(posting.descriptionHtml, "<p>Text.</p>");
});

test("location, description and recruit present but empty objects fall back safely, never thrown", () => {
  const response = JSON.stringify({
    data: {
      jobSearch: {
        results: [{ job: { key: "x", title: "Role", location: {}, description: {}, recruit: {} } }],
      },
    },
  });
  const [posting] = parseIndeedSearch(response);
  assert.equal(posting.location, "");
  assert.equal(posting.snippet, "");
  assert.equal(posting.descriptionHtml, null);
  assert.equal(posting.link, "https://ph.indeed.com/viewjob?jk=x");
});

test("recruit.viewJobUrl trims surrounding whitespace", () => {
  const padded = JSON.stringify({
    data: {
      jobSearch: {
        results: [{ job: { key: "x", title: "Role", recruit: { viewJobUrl: "  https://example.com  " } } }],
      },
    },
  });
  const [posting] = parseIndeedSearch(padded);
  assert.equal(posting.link, "https://example.com");
});

test("sourceEmployerName, used as the fallback, also trims surrounding whitespace", () => {
  const padded = JSON.stringify({
    data: { jobSearch: { results: [{ job: { key: "x", title: "Role", sourceEmployerName: "  Acme  " } }] } },
  });
  const [posting] = parseIndeedSearch(padded);
  assert.equal(posting.company, "Acme");
});

test("a result missing employer, location, description and recruit entirely falls back to empty/constructed values, never thrown", () => {
  const response = JSON.stringify({ data: { jobSearch: { results: [{ job: { key: "abc123", title: "Role" } }] } } });
  const [posting] = parseIndeedSearch(response);
  assert.equal(posting.company, "");
  assert.equal(posting.location, "");
  assert.equal(posting.snippet, "");
  assert.equal(posting.descriptionHtml, null);
  assert.equal(posting.link, "https://ph.indeed.com/viewjob?jk=abc123");
});

test("the confirmed live header values are exact, not placeholders", () => {
  assert.equal(INDEED_HEADERS["indeed-api-key"], "161092c2017b5bbab13edb12461a62d5a833871e7cad6d9d475304573de67ac8");
  assert.equal(INDEED_HEADERS["indeed-co"], "PH");
  assert.equal(INDEED_HEADERS["indeed-locale"], "en-PH");
  assert.equal(INDEED_HEADERS["content-type"], "application/json");
  assert.equal(INDEED_HEADERS["accept"], "application/json");
  assert.ok(INDEED_HEADERS["user-agent"].includes("Indeed App"));
  assert.ok(INDEED_HEADERS["indeed-app-info"].includes("appid=com.indeed.jobsearch"));
  assert.ok(INDEED_HEADERS["accept-language"].length > 0);
});

test("malformed JSON, or a response with GraphQL errors instead of data, parses to an empty list, not thrown", () => {
  assert.deepEqual(parseIndeedSearch("not json"), []);
  assert.deepEqual(parseIndeedSearch(JSON.stringify({ errors: [{ message: "bad query" }] })), []);
  assert.deepEqual(parseIndeedSearch(JSON.stringify({ data: { jobSearch: null } })), []);
});

test("builds the search URL carrying the keyword for fetchSearch to read back -- Indeed's real request is a POST, not a GET", () => {
  const url = indeedSearchUrl("Full-Stack Engineer");
  assert.equal(new URL(url).searchParams.get("q"), "Full-Stack Engineer");
});

test("builds a GraphQL query for Philippines, 100 results, with the keyword embedded as the what clause", () => {
  const query = indeedSearchQuery("Full-Stack Engineer", null);
  assert.match(query, /what:\s*"Full-Stack Engineer"/);
  assert.match(query, /where:\s*"Philippines"/);
  assert.match(query, /limit:\s*100\s*sort: RELEVANCE/, "nothing but whitespace sits between limit and sort");
  assert.ok(!query.includes("cursor:"), "no cursor argument when none is given");
});

test("the query includes a cursor argument when one is given", () => {
  const query = indeedSearchQuery("Full-Stack Engineer", "abc123");
  assert.match(query, /cursor:\s*"abc123"/);
});
