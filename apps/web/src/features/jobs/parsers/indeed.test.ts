import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { parseIndeedAlert } from "./indeed";

const fixture = readFileSync(join(import.meta.dirname, "fixtures/indeed-alert.html"), "utf8");

test("parses every job card in a saved alert email", () => {
  const postings = parseIndeedAlert(fixture);
  assert.equal(postings.length, 2);
});

test("extracts title, company, location, snippet, link and a prefixed source ID from the jk query param", () => {
  const [first] = parseIndeedAlert(fixture);
  assert.deepEqual(first, {
    source: "indeed",
    sourceId: "in-abc123def456",
    title: "React Developer",
    company: "Northwind Labs",
    location: "United Kingdom",
    snippet: "Contract role, remote-first team.",
    link: "https://www.indeed.com/viewjob?jk=abc123def456",
  });
});

test("a page with no job cards parses to an empty list, not an error", () => {
  assert.deepEqual(parseIndeedAlert("<html><body>No jobs today</body></html>"), []);
});
