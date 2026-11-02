import assert from "node:assert/strict";
import { test } from "node:test";
import { checkFreehire } from "./check-freehire";

function noopDeps() {
  return {
    secret: "s3cret",
    expectedSecret: "s3cret",
    keywords: ["Frontend Engineer"],
    fetchSearch: async () => ({ status: 200, text: JSON.stringify({ data: [] }) }),
    savePostings: async () => {},
  };
}

test("a correct secret searches every keyword and saves what it finds", async () => {
  const fetchedUrls: string[] = [];
  const saved: unknown[] = [];
  const posting = {
    public_slug: "a",
    title: "Frontend Engineer",
    company: "Acme",
    location: "Remote",
    description: "<p>Text.</p>",
    url: "https://example.com/a",
  };
  const result = await checkFreehire({
    ...noopDeps(),
    keywords: ["Frontend Engineer", "React Developer"],
    fetchSearch: async (url) => {
      fetchedUrls.push(url);
      return { status: 200, text: JSON.stringify({ data: [posting] }) };
    },
    savePostings: async (postings) => {
      saved.push(...postings);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(fetchedUrls.length, 2);
  assert.equal(saved.length, 2, "one posting found per keyword, both saved");
});

test("a wrong secret is rejected and nothing is fetched or saved", async () => {
  let fetched = false;
  const result = await checkFreehire({
    ...noopDeps(),
    secret: "wrong",
    fetchSearch: async () => {
      fetched = true;
      return { status: 200, text: "{}" };
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "bad secret");
  assert.equal(fetched, false);
});

test("a non-200 response for one keyword is skipped, not escalated to a block state -- other keywords still save", async () => {
  const saved: unknown[] = [];
  const posting = {
    public_slug: "b",
    title: "React Developer",
    company: "Acme",
    location: "Remote",
    description: "<p>Text.</p>",
    url: "https://example.com/b",
  };
  const result = await checkFreehire({
    ...noopDeps(),
    keywords: ["Frontend Engineer", "React Developer"],
    fetchSearch: async (url) => {
      if (url.includes("Frontend")) return { status: 500, text: "" };
      return { status: 200, text: JSON.stringify({ data: [posting] }) };
    },
    savePostings: async (postings) => {
      saved.push(...postings);
    },
  });
  assert.equal(result.ok, true);
  assert.equal(saved.length, 1, "the failing keyword contributes nothing, the working one still saves");
});

test("every keyword failing still returns ok, with nothing found", async () => {
  const result = await checkFreehire({
    ...noopDeps(),
    fetchSearch: async () => ({ status: 500, text: "" }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.found, 0);
});

test("searches run in parallel, not one at a time", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  await checkFreehire({
    ...noopDeps(),
    keywords: ["Frontend Engineer", "React Developer", "Software Engineer"],
    fetchSearch: async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight--;
      return { status: 200, text: JSON.stringify({ data: [] }) };
    },
  });
  assert.equal(maxInFlight, 3);
});
