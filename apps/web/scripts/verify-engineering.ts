import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { labProgress, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Engineering, with no AI calls. Throwaway users keep the owner's record untouched.
// Spec: docs/architecture/engineering-rebuild.md. Run with: pnpm --filter @ken-os/web test:db:engineering
async function main() {
  const store = await import("../src/features/engineering-lab/store");

  const owner = `engineering-check-${randomUUID()}`;
  const other = `engineering-check-${randomUUID()}`;
  await db().insert(users).values([
    { id: owner, email: `${owner}@example.invalid`, name: "Engineering check" },
    { id: other, email: `${other}@example.invalid`, name: "Engineering check (other)" },
  ]);
  try {
    // Topic states (section 2): Learning, Practicing, then Proven only after a passed exercise and a passed proof.
    const topicId = "rel.retry_backoff";
    assert.equal((await store.getProgress(owner, topicId)).state, "NOT_STARTED");
    assert.equal((await store.markLessonOpened(owner, topicId)).state, "LEARNING");
    assert.equal((await store.markLessonOpened(owner, topicId)).state, "LEARNING", "opening again changes nothing");
    let { progress } = await store.recordEvent(owner, { topicId, kind: "exercise_run", labId: "retry-policy", passed: false });
    assert.equal(progress.state, "PRACTICING");
    assert.equal(progress.exercisePassed, false);
    ({ progress } = await store.recordEvent(owner, { topicId, kind: "exercise_run", labId: "retry-policy", passed: true }));
    assert.equal(progress.exercisePassed, true);
    ({ progress } = await store.recordEvent(owner, { topicId, kind: "solution_opened", labId: "retry-policy" }));
    assert.equal(progress.exercisePassed, false, "opening the solution closes Prove again");
    ({ progress } = await store.recordEvent(owner, { topicId, kind: "proof", passed: true, label: "solid" }));
    assert.equal(progress.state, "PRACTICING", "a proof without a standing exercise pass proves nothing");
    ({ progress } = await store.recordEvent(owner, { topicId, kind: "exercise_run", labId: "retry-policy", passed: true }));
    ({ progress } = await store.recordEvent(owner, { topicId, kind: "proof", passed: true, label: "solid" }));
    assert.equal(progress.state, "PROVEN");
    assert.ok(progress.nextReviewAt, "a proven topic gets its first review date");
    ({ progress } = await store.recordEvent(owner, { topicId, kind: "review", label: "gap" }));
    assert.equal(progress.state, "PROVEN", "a bad review never takes Proven away");
    assert.equal(progress.reviewIntervalDays, 1, "it just comes back tomorrow");
    const [cached] = await db().select().from(labProgress).where(and(eq(labProgress.userId, owner), eq(labProgress.topicId, topicId)));
    assert.equal(cached.status, "PROVEN", "lab_progress caches the rebuilt state");
    assert.deepEqual([...await store.provenTopics(owner)], [topicId]);
    assert.equal((await store.getAllProgress(other)).find((item) => item.topicId === topicId)!.state, "NOT_STARTED", "progress is per owner");
    console.log("ok - topic states follow lesson, exercise, solution and proof events");

    await assert.rejects(store.recordEvent(owner, { topicId: "js.async_races", kind: "lesson_opened" }), /Unknown topic/);
    console.log("ok - events for deleted topics are refused");
  } finally {
    await db().delete(users).where(eq(users.id, owner));
    await db().delete(users).where(eq(users.id, other));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
