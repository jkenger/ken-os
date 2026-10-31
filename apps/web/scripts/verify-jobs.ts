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

    const preferences = await import("../src/features/jobs/preferences-store");
    const defaults = await preferences.getPreferences(userId);
    assert.deepEqual(defaults, { skipWords: [], skipCompanies: [], postedWithinDays: 14 });
    console.log("ok - preferences default to no skip words, no skip companies, 14 days");

    await preferences.savePreferences(userId, {
      skipWords: ["Sales", "Marketing"],
      skipCompanies: ["Acme"],
      postedWithinDays: 7,
    });
    const saved = await preferences.getPreferences(userId);
    assert.deepEqual(saved, { skipWords: ["Sales", "Marketing"], skipCompanies: ["Acme"], postedWithinDays: 7 });
    console.log("ok - saved preferences persist and reload correctly");

    await preferences.savePreferences(userId, { skipWords: ["Only this"], skipCompanies: [], postedWithinDays: 30 });
    const resaved = await preferences.getPreferences(userId);
    assert.deepEqual(resaved, { skipWords: ["Only this"], skipCompanies: [], postedWithinDays: 30 });
    console.log("ok - saving again replaces the previous preferences, not merges with them");

    await store.savePostings(userId, [
      {
        source: "linkedin",
        sourceId: "li-skip-word",
        title: "Only this Role",
        company: "FilterCo",
        location: "Remote",
        snippet: "Matches the skip word.",
        link: "https://www.linkedin.com/jobs/view/2",
      },
    ]);
    const newAfterSkipWord = await store.listPostings(userId, "new");
    assert.ok(
      !newAfterSkipWord.some((posting) => posting.title === "Only this Role"),
      "a posting matching a skip word does not land under New",
    );
    const filteredOut = await store.listPostings(userId, "filtered_out");
    const skipWordPosting = filteredOut.find((posting) => posting.title === "Only this Role");
    assert.ok(skipWordPosting);
    assert.equal(skipWordPosting.filterReason, "Skip word: Only this");
    console.log("ok - a posting whose title matches a skip word is filtered out, with the matched word as the reason");

    await store.showAnyway(userId, skipWordPosting.id);
    const afterShowAnyway = await store.listPostings(userId, "new");
    const movedBack = afterShowAnyway.find((posting) => posting.title === "Only this Role");
    assert.ok(movedBack);
    assert.equal(movedBack.filterReason, null);
    console.log("ok - Show anyway moves a filtered posting back to New and clears its reason");

    await preferences.savePreferences(userId, { skipWords: [], skipCompanies: [], postedWithinDays: 0 });
    await store.refilterExisting(userId);
    const afterRefilter = await store.listPostings(userId, "filtered_out");
    assert.ok(
      afterRefilter.some(
        (posting) => posting.title === "Only this Role" && posting.filterReason === "Posted over 0 days ago",
      ),
    );
    console.log(
      "ok - saving a stricter posted-within-days setting refilters postings already saved, not just new ones",
    );

    const scraperState = await import("../src/features/jobs/scraper-state");
    const notYetChecked = await scraperState.getScraperState(userId, "linkedin");
    assert.equal(notYetChecked, null);
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false);
    console.log("ok - a source with no recorded run is not blocked");

    await scraperState.recordRun(userId, "linkedin", "ok");
    const afterRun = await scraperState.getScraperState(userId, "linkedin");
    assert.equal(afterRun?.lastResult, "ok");
    assert.equal(afterRun?.blockedUntil, null);
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false);
    console.log("ok - a successful run records its result and leaves the source unblocked");

    await scraperState.recordBlocked(userId, "linkedin");
    const afterBlock = await scraperState.getScraperState(userId, "linkedin");
    assert.equal(afterBlock?.lastResult, "blocked");
    assert.ok(afterBlock?.blockedUntil && afterBlock.blockedUntil.getTime() > Date.now());
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), true);
    console.log("ok - a block sets blockedUntil about 24 hours out and reports the source as blocked");

    await scraperState.recordRun(userId, "linkedin", "empty");
    assert.equal(await scraperState.isBlocked(userId, "linkedin"), false);
    console.log("ok - a later successful run clears the block");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
