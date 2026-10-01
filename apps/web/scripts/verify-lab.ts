import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import type { AssessmentItem } from "@ken-os/domain";
import { closeDb, db } from "../src/lib/db";
import { labAssessments, labAttempts, labProgressChanges, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Engineering Lab, with no AI calls. It uses a throwaway user so the owner's learning record is
// never touched, and deletes that user (and, by cascade, everything it created) at the end.
async function main() {
  const store = await import("../src/features/engineering-lab/store");
  const userId = `lab-check-${randomUUID()}`;
  await db().insert(users).values({ id: userId, email: `${userId}@example.invalid`, name: "Engineering Lab check" });
  try {
    const today = await store.getToday(userId);
    assert.equal(today.plan?.topicId, "js.call_stack", "a fresh learner starts with the call stack");
    assert.equal(today.progress.find((item) => item.topicId === "js.event_loop")?.baselineLabel, "misconception");
    console.log("ok - fresh learner: plan and baseline");

    const topicId = "js.references_mutation";
    const items: AssessmentItem[] = [
      { mode: "predict", prompt: "What prints?", code: "const a = { n: { v: 1 } }; const b = { ...a }; console.log(a === b); console.log(a.n === b.n);", expectedOutput: ["false", "true"] },
      { mode: "predict", prompt: "What prints?", code: "console.log(1)", expectedOutput: ["2"] },
      { mode: "explain", prompt: "Why?", code: null, rubric: ["identity"], misconceptionsToWatch: [] },
    ];
    const assessmentId = randomUUID();
    await db().insert(labAssessments).values({ id: assessmentId, userId, topicId, kind: "assessment", items, promptVersion: "check", model: "none" });

    // Two answers to different questions at the same moment: both land, and the status change is logged once.
    const [first, second] = await Promise.all([
      store.submitAnswer(userId, { assessmentId, itemIndex: 0, selfRating: 4, response: { lines: ["false", "true"] }, actualOutput: ["false", "true"] }),
      store.submitAnswer(userId, { assessmentId, itemIndex: 1, selfRating: 2, response: { lines: ["1"] }, actualOutput: ["1"] }),
    ]);
    assert.equal(first.grade.label, "solid");
    assert.equal(second.grade.voided, true, "a question whose expected answer disagrees with the real run is thrown out");
    const changes = await db().select().from(labProgressChanges).where(and(eq(labProgressChanges.userId, userId), eq(labProgressChanges.topicId, topicId)));
    assert.equal(changes.length, 1, "concurrent answers log one status change");
    assert.equal(changes[0].toStatus, "PRACTICING");
    console.log("ok - concurrent answers, voided question, single change record");

    await assert.rejects(
      store.submitAnswer(userId, { assessmentId, itemIndex: 0, selfRating: 4, response: { lines: ["false", "true"] }, actualOutput: ["false", "true"] }),
      (error: Error) => error instanceof store.LabInputError && error.status === 409,
    );
    await assert.rejects(store.submitAnswer(userId, { assessmentId, itemIndex: 2, selfRating: 0, response: { text: "Because spread is shallow." } }), /how sure/);
    console.log("ok - one answer per question, confidence required");

    // The lab is proof only until the solution is seen.
    const pass = await store.submitLabRun(userId, { labId: "shallow-copy", code: "// fixed", run: { passed: 2, failed: 0, output: "" } });
    assert.equal(pass.solutionSeen, false);
    await db().insert(labAttempts).values({
      id: randomUUID(), userId, topicId, kind: "assessment", mode: "explain", assessmentId, itemIndex: 2, item: items[2] as unknown as Record<string, unknown>,
      response: { text: "Spread copies one level; nested objects are shared references." }, selfRating: 4, label: "solid", gradedBy: "assessor", misconceptions: [], feedback: "Correct.",
    });
    const proven = await store.rebuildProgress(userId, topicId);
    assert.equal(proven.status, "VALIDATED", "predict by code, explain and a clean lab pass validate the topic");
    assert.ok(proven.nextReviewAt, "validation schedules a review");
    console.log("ok - validation from code-checked predict, graded explain and a lab pass");

    const solution = await store.revealSolution(userId, "shallow-copy");
    assert.match(solution, /withTheme/);
    const afterReveal = await store.submitLabRun(userId, { labId: "shallow-copy", code: "// fixed", run: { passed: 2, failed: 0, output: "" } });
    assert.equal(afterReveal.solutionSeen, true);
    const failedLab = await store.submitLabRun(userId, { labId: "shallow-copy", code: "// broken", run: { passed: 0, failed: 2, output: "" } });
    assert.equal(failedLab.grade.label, "gap");
    assert.equal(failedLab.statuses[topicId], "VALIDATED", "a lab run after seeing the solution counts neither way");

    const reviewId = randomUUID();
    await db().insert(labAssessments).values({ id: reviewId, userId, topicId, kind: "review", items: [items[0]], promptVersion: "check", model: "none" });
    const slip = await store.submitAnswer(userId, { assessmentId: reviewId, itemIndex: 0, selfRating: 5, response: { lines: ["true", "true"] }, actualOutput: ["false", "true"] });
    assert.equal(slip.status, "NEEDS_REVISIT", "a failed review after validation brings the topic back");
    console.log("ok - solution reveal recorded and ignored as proof; a failed review sets NEEDS_REVISIT");

    const view = await store.getTopicView(userId, topicId);
    assert.equal(view.assessment?.kind, "review", "the topic page shows the newest question set");
    assert.equal(view.assessment?.items[0].answered?.label, "partial", "a wrong value, not a wrong order");
    assert.ok(view.assessment?.items.every((item) => !("expectedOutput" in item) && !("rubric" in item)), "answers and rubrics never reach the browser");
    assert.equal(view.revealedLabs.includes("shallow-copy"), true);
    const plan = (await store.getToday(userId)).plan;
    assert.equal(plan?.kind, "review");
    assert.equal(plan?.topicId, topicId);
    console.log("ok - topic view hides answers; Today brings the slipped topic back first");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
