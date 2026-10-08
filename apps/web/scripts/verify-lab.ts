import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import type { AssessmentItem, LessonSnapshot, SourcePacket } from "@ken-os/domain";
import { closeDb, db } from "../src/lib/db";
import { labAssessments, labAttempts, labLessons, labProgressChanges, labSourcePackets, users } from "../src/lib/schema";

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
    assert.equal(today.progress.find((item) => item.topicId === "js.event_loop")?.baselineLabel, null, "the 1 Oct summary is retired: no baseline label before the in-app run");
    console.log("ok - fresh learner: plan and baseline");

    const topicId = "js.references_mutation";
    const items: AssessmentItem[] = [
      { mode: "predict", prompt: "What prints?", code: "const a = { n: { v: 1 } }; const b = { ...a }; console.log(a === b); console.log(a.n === b.n);", expectedOutput: ["false", "true"], explanation: "Spread makes a new outer object but copies the nested reference." },
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
    const fresh = await store.getTopicView(userId, topicId);
    assert.ok(fresh.assessment?.items.every((item) => !("explanation" in item)), "explanations stay hidden until the question is answered");
    const slip = await store.submitAnswer(userId, { assessmentId: reviewId, itemIndex: 0, selfRating: 5, response: { lines: ["true", "true"], why: "Spread copies everything." }, actualOutput: ["false", "true"] });
    assert.equal(slip.status, "NEEDS_REVISIT", "a failed review after validation brings the topic back");
    console.log("ok - solution reveal recorded and ignored as proof; a failed review sets NEEDS_REVISIT");

    const view = await store.getTopicView(userId, topicId);
    assert.equal(view.assessment?.kind, "review", "the topic page shows the newest question set");
    assert.equal(view.assessment?.items[0].answered?.label, "partial", "a wrong value, not a wrong order");
    assert.ok(view.assessment?.items.every((item) => !("expectedOutput" in item) && !("rubric" in item)), "answers and rubrics never reach the browser");
    assert.deepEqual(view.assessment?.items[0].answered?.answer, { lines: ["true", "true"], text: null, why: "Spread copies everything.", actual: ["false", "true"] }, "the learner's answer survives a reload");
    assert.match(view.assessment?.items[0].answered?.explanation ?? "", /nested reference/, "the explanation appears once answered");
    assert.equal(view.revealedLabs.includes("shallow-copy"), true);
    const plan = (await store.getToday(userId)).plan;
    assert.equal(plan?.kind, "review");
    assert.equal(plan?.topicId, topicId);
    console.log("ok - topic view hides answers until answered, keeps the learner's answer; Today brings the slipped topic back first");

    // Lesson practice: the answer and why are kept, and a practice prediction locks once it's right.
    const practiceTopic = "js.event_loop";
    const packetId = randomUUID();
    await db().insert(labSourcePackets).values({
      id: packetId, userId, topicId: practiceTopic, packet: { topicId: practiceTopic } as unknown as SourcePacket, refreshAfter: "2099-01-01", generatedAt: new Date(),
    });
    const lessonId = randomUUID();
    const practiceItem = { kind: "predict" as const, prompt: "What prints, and why?", code: "setTimeout(() => console.log(1)); console.log(2);", expectedOutput: ["2", "1"], explanation: "The timer waits for a new task." };
    await db().insert(labLessons).values({
      id: lessonId, userId, topicId: practiceTopic, version: 1, sourcePacketId: packetId,
      snapshot: { practice: [practiceItem], sections: {} } as unknown as LessonSnapshot,
    });
    const miss = await store.submitPractice(userId, { lessonId, practiceIndex: 0, lines: ["2"], why: "Timers run later.", actualOutput: ["2", "1"] });
    assert.equal(miss.grade.label, "partial");
    const missView = await store.getTopicView(userId, practiceTopic);
    assert.deepEqual(missView.practiceResults[0].answer, { lines: ["2"], text: null, why: "Timers run later.", actual: ["2", "1"] }, "the practice answer survives a reload");
    const hit = await store.submitPractice(userId, { lessonId, practiceIndex: 0, lines: ["2", "1"], actualOutput: ["2", "1"] });
    assert.equal(hit.grade.label, "solid", "a wrong practice answer can be retried");
    await assert.rejects(
      store.submitPractice(userId, { lessonId, practiceIndex: 0, lines: ["2", "1"], actualOutput: ["2", "1"] }),
      (error: Error) => error instanceof store.LabInputError && error.status === 409,
      "a solid practice answer can't be submitted again",
    );
    console.log("ok - practice keeps the answer and why, allows retries, and locks once solid");

    // Placement: answering a placement set marks the topic known, and a started topic can't get one.
    await assert.rejects(store.generateAssessment(userId, practiceTopic, "placement"), (error: Error) => error instanceof store.LabInputError && error.status === 409);
    const placementTopic = "js.call_stack";
    const placementId = randomUUID();
    await db().insert(labAssessments).values({ id: placementId, userId, topicId: placementTopic, kind: "placement", items: [{ mode: "predict", prompt: "What prints?", code: "console.log(1); console.log(2);", expectedOutput: ["1", "2"] }], promptVersion: "check", model: "none" });
    await store.submitAnswer(userId, { assessmentId: placementId, itemIndex: 0, selfRating: 5, response: { lines: ["1", "2"] }, actualOutput: ["1", "2"] });
    const placed = (await store.getAllProgress(userId)).find((item) => item.topicId === placementTopic)!;
    assert.equal(placed.placement, "passed");
    const [placementAttempt] = await db().select({ kind: labAttempts.kind }).from(labAttempts).where(eq(labAttempts.assessmentId, placementId));
    assert.equal(placementAttempt.kind, "placement");
    console.log("ok - a passed placement check marks the topic known; started topics can't take one");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
