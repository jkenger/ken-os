import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Jobs receiving and listing (docs/product/job-finder.md, release step 1). A throwaway user is
// created and deleted, cascading everything it made.
async function main() {
  const store = await import("../src/features/jobs/store");
  const userId = `jobs-check-${randomUUID()}`;
  await db()
    .insert(users)
    .values({ id: userId, email: `${userId}@example.invalid`, name: "Jobs Check" });

  try {
    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-1",
        title: "Senior Frontend Engineer",
        company: "Acme Inc",
        location: "Remote, United States",
        snippet: "Join our team.",
        link: "https://www.linkedin.com/jobs/view/1",
      },
    ]);
    let postings = await store.listPostings(userId, "new");
    assert.equal(postings.length, 1);
    assert.equal(postings[0].title, "Senior Frontend Engineer");
    assert.deepEqual(postings[0].sources, [{ source: "linkedin", link: "https://www.linkedin.com/jobs/view/1" }]);
    console.log("ok - a new posting is saved and listed under New");

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-1",
        title: "Senior Frontend Engineer",
        company: "Acme Inc",
        location: "Remote, United States",
        snippet: "Join our team.",
        link: "https://www.linkedin.com/jobs/view/1",
      },
    ]);
    postings = await store.listPostings(userId, "new");
    assert.equal(postings.length, 1, "the same source ID twice does not duplicate");
    console.log("ok - the same posting from the same source arriving twice is not duplicated");

    await store.savePostings(userId, [
      {
        source: "indeed",
        sourceId: "in-9",
        title: "Senior Frontend Engineer",
        company: "Acme Inc",
        location: "Remote, United States",
        snippet: "Different snippet text from Indeed.",
        link: "https://www.indeed.com/viewjob?jk=9",
      },
    ]);
    postings = await store.listPostings(userId, "new");
    assert.equal(postings.length, 1, "matching title, company and location merges into one posting");
    assert.deepEqual(
      postings[0].sources.map((source) => source.source).sort(),
      ["indeed", "linkedin"],
      "the merged posting lists every source it came from",
    );
    console.log("ok - the same posting from a second source merges instead of duplicating, listing both sources");

    const inboundId = await store.saveInboundEmail({
      userId,
      fromAddress: "jobs-noreply@linkedin.com",
      source: "linkedin",
      rawHtml: "<html></html>",
    });
    assert.ok(inboundId);
    console.log("ok - a raw inbound email is stored");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
