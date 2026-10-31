import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { parseLinkedInAlert } from "./linkedin";

const fixture = readFileSync(join(import.meta.dirname, "fixtures/linkedin-alert.html"), "utf8");

test("parses every job card in a saved alert email", () => {
  const postings = parseLinkedInAlert(fixture);
  assert.equal(postings.length, 3);
});

test("extracts title, company, location, snippet, link and a prefixed source ID", () => {
  const [first] = parseLinkedInAlert(fixture);
  assert.deepEqual(first, {
    source: "linkedin",
    sourceId: "li-3912345671",
    title: "Senior Frontend Engineer",
    company: "Acme Inc",
    location: "Remote, United States",
    snippet: "Join our team building the next generation of our product.",
    link: "https://www.linkedin.com/jobs/view/3912345671/?trk=email_alert",
  });
});

test("a page with no job cards parses to an empty list, not an error", () => {
  assert.deepEqual(parseLinkedInAlert("<html><body>No jobs today</body></html>"), []);
});
