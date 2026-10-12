import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { TERM_LOOKUP_LIMIT } from "@ken-os/domain";
import { closeDb, db } from "../src/lib/db";
import { kenTermLookups, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Terms, with no AI calls. A throwaway user is created and deleted, cascading everything it made.
async function main() {
  const store = await import("../src/features/terms/store");
  const userId = `terms-check-${randomUUID()}`;
  await db()
    .insert(users)
    .values({ id: userId, email: `${userId}@example.invalid`, name: "Terms check" });
  try {
    const first = await store.saveTerm(userId, {
      term: "Microtask",
      meaning: "A small job that runs right after the current code finishes.",
      sourceTitle: "MDN",
      sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide",
      foundIn: "Engineering Lab · Event loop",
      foundAt: "/lab/topics/js.event_loop?step=learn",
    });
    assert.ok(first.id);
    const again = await store.saveTerm(userId, {
      term: "microtask.",
      meaning: "Same term, different spelling.",
      sourceTitle: null,
      sourceUrl: null,
      foundIn: "x",
      foundAt: "/",
    });
    assert.equal(again.alreadySaved, true, "one saved term per spelling");
    await store.saveTerm(userId, {
      term: "skip scan",
      meaning: "A Postgres trick for multicolumn indexes.",
      sourceTitle: "Blog",
      sourceUrl: "https://someblog.example/post",
      foundIn: "Lab",
      foundAt: "//evil.example",
    });
    const terms = await store.listTerms(userId);
    assert.equal(terms.length, 2);
    const skip = terms.find((term) => term.term === "skip scan")!;
    assert.equal(skip.source, null, "an untrusted link is never stored");
    assert.equal(skip.foundAt, "/", "the link back stays on Ken OS");
    console.log("ok - save, one per spelling, untrusted links and off-site paths dropped");

    const known = await store.lookupTerm(userId, { selection: "MICROTASK", context: "", place: "" });
    assert.equal(known.saved, true);
    assert.match(known.meaning, /small job/, "a saved term is answered from Terms without an AI call");
    await db()
      .insert(kenTermLookups)
      .values(Array.from({ length: TERM_LOOKUP_LIMIT }, () => ({ id: randomUUID(), userId, model: "check" })));
    await assert.rejects(
      store.lookupTerm(userId, { selection: "brand new term", context: "", place: "" }),
      (error: Error) => error instanceof store.TermInputError && error.status === 429,
    );
    await assert.rejects(store.lookupTerm(userId, { selection: "x".repeat(61), context: "", place: "" }), /up to 60/);
    console.log("ok - saved terms skip the AI; the daily limit and length limit hold");

    // A lookup the browser stopped waiting for was still stored, so asking again reuses it: no AI call, no limit.
    await db()
      .insert(kenTermLookups)
      .values({
        id: randomUUID(),
        userId,
        model: "check",
        termKey: "event loop",
        answer: { term: "event loop", meaning: "The loop that runs tasks and microtasks.", source: null },
      });
    const reused = await store.lookupTerm(userId, { selection: "Event Loop", context: "", place: "" });
    assert.equal(reused.reused, true);
    assert.equal(reused.saved, false);
    assert.match(
      reused.meaning,
      /tasks and microtasks/,
      "the stored answer comes back even with today's limit used up",
    );
    console.log("ok - a finished lookup is reused for 30 days without an AI call");

    await store.deleteTerm(userId, skip.id);
    assert.equal((await store.listTerms(userId)).length, 1);
    await assert.rejects(
      store.deleteTerm(`${userId}-other`, first.id!),
      (error: Error) => error instanceof store.TermInputError && error.status === 404,
      "another user can't delete it",
    );
    console.log("ok - delete removes only your own term");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
