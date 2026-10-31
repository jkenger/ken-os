import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Live check against the real freehire API (plans/jobs-freehire-source.md, Slice 1 Done-when): confirms the real
// endpoint still behaves the way the fixture-based tests assume, not just that a saved sample parses. A throwaway
// user is created and deleted, cascading everything it made.
async function main() {
  const { freehireSearchUrl, parseFreehireSearch } = await import("../src/features/jobs/scrapers/freehire");
  const { checkFreehire } = await import("../src/features/jobs/check-freehire");
  const store = await import("../src/features/jobs/store");

  const url = freehireSearchUrl("Software Engineer", 7, 10);
  const response = await fetch(url);
  assert.equal(response.status, 200, "the real search endpoint responds 200");
  const text = await response.text();

  const postings = parseFreehireSearch(text);
  assert.ok(postings.length > 0, "a real query for a common role returns at least one posting");
  console.log(`ok - live search returned ${postings.length} real postings for "Software Engineer"`);

  for (const posting of postings.slice(0, 3)) {
    assert.equal(posting.source, "freehire");
    assert.ok(posting.sourceId?.startsWith("fh-"));
    assert.ok(posting.title.length > 0);
    assert.ok(posting.snippet.length > 0, "a real posting has non-empty full text, not just a snippet");
    assert.ok(!posting.snippet.includes("<p>"), "the real description decodes to plain text");
  }
  console.log("ok - real postings have the expected shape: freehire source, fh- sourceId, decoded plain-text snippet");

  const withCountries = postings.filter((p) => (p.sourceCountries?.length ?? 0) > 0);
  const withWorkMode = postings.filter((p) => p.sourceWorkMode);
  assert.ok(withCountries.length > 0, "at least one real posting states structured countries");
  console.log(
    `ok - ${withCountries.length}/${postings.length} real postings carry structured countries, ${withWorkMode.length}/${postings.length} carry a work mode -- Slice 2's override has real data to act on`,
  );

  const userId = `freehire-live-check-${randomUUID()}`;
  await db()
    .insert(users)
    .values({ id: userId, email: `${userId}@example.invalid`, name: "Freehire Live Check" });

  try {
    const result = await checkFreehire({
      secret: "live-check-secret",
      expectedSecret: "live-check-secret",
      keywords: ["Software Engineer"],
      fetchSearch: async (searchUrl) => {
        const res = await fetch(searchUrl);
        return { status: res.status, text: await res.text() };
      },
      savePostings: (found) => store.savePostings(userId, found),
    });
    assert.equal(result.ok, true);
    assert.ok(result.found > 0, "checkFreehire found and saved at least one real posting");
    console.log(`ok - checkFreehire against the live API found and saved ${result.found} postings`);

    const saved = await store.listPostings(userId, "new");
    const filteredOut = await store.listPostings(userId, "filtered_out");
    assert.ok(saved.length + filteredOut.length > 0, "real postings landed in New or Filtered out");
    console.log(`ok - real postings reached the owner's list: ${saved.length} New, ${filteredOut.length} Filtered out`);

    const pending = await store.getPendingPostings(userId, 10);
    assert.ok(pending.length > 0, "real saved postings are pending extraction");
    assert.ok(pending[0]!.snippet.length > 0, "a pending posting already has its full text, no separate fetch needed");
    console.log("ok - real postings are pending with their full text already present, ready for /api/jobs/process");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
  }

  await closeDb();
  console.log("All live freehire checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
