import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { orderedSourceLinks, parseIndeedDescription, parseLinkedInDescription, readFullPosting } from "./read-posting";

const linkedInFixture = readFileSync(join(import.meta.dirname, "fixtures/linkedin-posting.html"), "utf8");
const indeedFixture = readFileSync(join(import.meta.dirname, "fixtures/indeed-posting.html"), "utf8");

test("parses the full description out of a LinkedIn posting page", () => {
  const text = parseLinkedInDescription(linkedInFixture);
  assert.ok(text?.includes("open to candidates based anywhere"));
});

test("a LinkedIn page with no description markup parses to null", () => {
  assert.equal(parseLinkedInDescription("<html><body>Nothing here</body></html>"), null);
});

test("parses the full description out of an Indeed posting page", () => {
  const text = parseIndeedDescription(indeedFixture);
  assert.ok(text?.includes("Must be authorized to work in the United States"));
});

test("an Indeed page with no description markup parses to null", () => {
  assert.equal(parseIndeedDescription("<html><body>Nothing here</body></html>"), null);
});

test("orders LinkedIn before Indeed, regardless of input order", () => {
  const ordered = orderedSourceLinks([
    { source: "indeed", link: "https://www.indeed.com/viewjob?jk=1" },
    { source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" },
  ]);
  assert.deepEqual(
    ordered.map((s) => s.source),
    ["linkedin", "indeed"],
  );
});

test("reads the first source whose page is fetchable and parses, without trying the rest", async () => {
  const tried: string[] = [];
  const text = await readFullPosting(
    [
      { source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" },
      { source: "indeed", link: "https://www.indeed.com/viewjob?jk=1" },
    ],
    async (source, url) => {
      tried.push(source);
      return { status: 200, html: linkedInFixture };
    },
  );
  assert.ok(text?.includes("open to candidates based anywhere"));
  assert.deepEqual(tried, ["linkedin"]);
});

test("falls back to the next source when the first can't be read", async () => {
  const tried: string[] = [];
  const text = await readFullPosting(
    [
      { source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" },
      { source: "indeed", link: "https://www.indeed.com/viewjob?jk=1" },
    ],
    async (source) => {
      tried.push(source);
      if (source === "linkedin") return { status: 403, html: "" };
      return { status: 200, html: indeedFixture };
    },
  );
  assert.ok(text?.includes("Must be authorized to work in the United States"));
  assert.deepEqual(tried, ["linkedin", "indeed"]);
});

test("returns null when every source fails to read or parse", async () => {
  const text = await readFullPosting(
    [{ source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" }],
    async () => ({
      status: 403,
      html: "",
    }),
  );
  assert.equal(text, null);
});

test("a 200 response that doesn't match the description markup counts as unreadable, falls through", async () => {
  const tried: string[] = [];
  const text = await readFullPosting(
    [
      { source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" },
      { source: "indeed", link: "https://www.indeed.com/viewjob?jk=1" },
    ],
    async (source) => {
      tried.push(source);
      if (source === "linkedin") return { status: 200, html: "<html><body>captcha</body></html>" };
      return { status: 200, html: indeedFixture };
    },
  );
  assert.ok(text?.includes("Must be authorized to work in the United States"));
  assert.deepEqual(tried, ["linkedin", "indeed"]);
});
