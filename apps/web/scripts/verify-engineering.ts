import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { labProgress, labRunAnswers, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Engineering, with no AI calls. Throwaway users keep the owner's record untouched.
// Spec: docs/architecture/engineering-rebuild.md. Run with: pnpm --filter @ken-os/web test:db:engineering
async function main() {
  const store = await import("../src/features/engineering-lab/store");
  const runs = await import("../src/features/engineering-lab/assessment-store");
  const profiles = await import("../src/features/engineering-lab/profile-store");
  const topics = await import("../src/features/engineering-lab/topic-store");

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
    assert.equal((await topics.openLesson(owner, topicId)).state, "LEARNING");
    assert.equal((await topics.openLesson(owner, topicId)).state, "LEARNING", "opening again changes nothing");
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
    // Intake and assessment (section 3). No AI key here, so grading fails and the answer must stay saved.
    await assert.rejects(runs.startRun(owner), /intake first/);
    await assert.rejects(profiles.saveIntake(owner, { building: "A clinic booking app", role: "nobody", weeklyHours: 5 }), /Choose a role/);
    await assert.rejects(profiles.saveIntake(owner, { building: "A clinic booking app", role: "fullstack-applied-ai", weeklyHours: 41 }), /1 to 40/);
    await profiles.saveIntake(owner, { building: "A clinic booking app", role: "fullstack-applied-ai", weeklyHours: 6 });
    const saved = await profiles.getProfileRow(owner);
    assert.equal(saved?.direction, "fullstack-applied-ai", "the intake role is the first direction");
    assert.equal(saved?.weeklyHours, 6);
    const { id: runId } = await runs.startRun(owner);
    assert.equal((await runs.startRun(owner)).id, runId, "starting again resumes the open assessment");
    assert.ok(await runs.activeRun(owner), "an open run keeps lessons and lookups closed");
    let view = await runs.getRunView(owner, runId);
    assert.equal(view.questions.length, 5);
    assert.ok(!("rubric" in view.questions[0]), "rubrics stay on the server");
    await assert.rejects(runs.submitAnswer(owner, runId, { index: 1, answer: "Skipping ahead to the second one", selfRating: 3 }), /already answered/);
    await assert.rejects(runs.submitAnswer(owner, runId, { index: 0, answer: "Because sync code first", selfRating: 3 }), /what prints/);
    await assert.rejects(runs.submitAnswer(owner, runId, { index: 0, answer: "Because sync code first", output: "A C B", selfRating: 9 }), /confidence/);
    const first = await runs.submitAnswer(owner, runId, { index: 0, answer: "Synchronous code runs before the promise microtask.", output: "A\nC\nB", selfRating: 4 });
    assert.equal(first.graded, false, "no grader here");
    assert.deepEqual(first.answer.output, ["A", "C", "B"]);
    view = await runs.getRunView(owner, runId);
    assert.deepEqual(view.position, { kind: "grading", index: 0 }, "the next question waits for the grade");
    await assert.rejects(runs.submitAnswer(owner, runId, { index: 0, answer: "A second try at the same one", output: "A", selfRating: 2 }), /already answered/);
    await assert.rejects(runs.submitAnswer(owner, runId, { index: 1, answer: "Cancel the stale request first", selfRating: 2 }), /already answered/);
    console.log("ok - intake, start, order and locking hold; a failed grade keeps the answer");

    // Stand in for the grader, then finish the run.
    const grade = (index: number, label: "solid" | "gap") => db().update(labRunAnswers).set({ label, feedback: "Checked.", rubric: [], graderVersion: "check", gradedAt: new Date() })
      .where(and(eq(labRunAnswers.runId, runId), eq(labRunAnswers.questionIndex, index)));
    await grade(0, "solid");
    for (let index = 1; index < 5; index += 1) {
      await runs.submitAnswer(owner, runId, { index, answer: `An answer for question ${index + 1}.`, selfRating: 3 });
      await grade(index, index === 2 ? "gap" : "solid");
    }
    await runs.retryGrade(owner, runId, 4);
    view = await runs.getRunView(owner, runId);
    assert.ok(view.completedAt, "the run finishes once every answer is graded");
    assert.equal(await runs.activeRun(owner), null);
    const history = await runs.listRuns(owner);
    assert.deepEqual(history.map((run) => [run.answers, run.solid]), [[5, 4]]);
    assert.deepEqual(await runs.latestAreaScores(owner), { foundations: 4, frontend: 4, backend: 0, production: 4, ai: 4 });
    const second = await runs.startRun(owner);
    assert.notEqual(second.id, runId, "a retake is a new row; the first never changes");
    assert.equal((await runs.getRunView(owner, runId)).answers.length, 5);
    await assert.rejects(runs.getRunView(other, runId), /not found/, "another owner cannot read it");
    await profiles.saveDirection(owner, { role: "frontend-developer", weeklyHours: 3 });
    assert.equal((await profiles.getProfileRow(owner))?.direction, "frontend-developer");
    assert.equal((await runs.getRunView(owner, runId)).answers.length, 5, "a new direction never changes evidence");
    console.log("ok - grades finish the run, history keeps every run, direction leaves evidence alone");
    // Topic page (section 3, Topic). A fresh owner, so the run above doesn't keep lessons closed.
    const learner = `engineering-check-${randomUUID()}`;
    await db().insert(users).values({ id: learner, email: `${learner}@example.invalid`, name: "Engineering check (learner)" });
    try {
      const retry = "rel.retry_backoff";
      const lesson = await topics.getLesson(learner, retry);
      assert.equal(lesson?.authored, true, "Retry & backoff ships with its hand-written lesson");
      await assert.rejects(topics.openLesson(learner, "js.closures"), /No lesson yet/, "no lesson, nothing to open");
      await assert.rejects(topics.getOrWriteProof(learner, retry), /Pass the exercise first/);
      await assert.rejects(topics.recordExerciseRun(learner, retry, { labId: "closure-loop", code: "", passed: 1, failed: 0, output: "" }), /another topic/);
      let ran = await topics.recordExerciseRun(learner, retry, { labId: "retry-policy", code: "function retryDelay() { return 1000; }", passed: 1, failed: 3, output: "" });
      assert.equal(ran.passed, false);
      assert.equal(ran.progress.state, "PRACTICING");
      ran = await topics.recordExerciseRun(learner, retry, { labId: "retry-policy", code: "...", passed: 4, failed: 0, output: "" });
      assert.equal(ran.progress.exercisePassed, true);
      const { solution } = await topics.openSolution(learner, retry, "retry-policy");
      assert.match(solution, /Math\.min/);
      await assert.rejects(topics.getOrWriteProof(learner, retry), /Pass the exercise first/, "opening the solution closes Prove");
      await topics.recordExerciseRun(learner, retry, { labId: "retry-policy", code: "...", passed: 4, failed: 0, output: "" });
      const proof = await topics.getOrWriteProof(learner, retry);
      assert.match(proof.prompt, /The payment timed out/, "the hand-written proof needs no AI");
      assert.equal((await topics.getOrWriteProof(learner, retry)).id, proof.id, "Try again reuses the prompt");
      await assert.rejects(topics.submitProof(learner, retry, { questionId: proof.id, answer: "Too short", selfRating: 3 }), /at least 30/);
      await assert.rejects(topics.submitProof(other, retry, { questionId: proof.id, answer: "x".repeat(40), selfRating: 3 }), /Pass the exercise first/);
      const view = await topics.getTopicView(learner, retry);
      assert.equal(view.proof?.id, proof.id);
      assert.equal(view.evidence.filter((item) => item.kind === "exercise_run").length, 3);
      assert.ok(view.sourcesCheckedAt);

      // event-loop-order serves two topics: one run counts for both.
      await topics.recordExerciseRun(learner, "js.promises", { labId: "event-loop-order", code: "...", passed: 3, failed: 0, output: "" });
      assert.equal((await store.getProgress(learner, "js.event_loop")).exercisePassed, true);

      // An open assessment closes lessons.
      await profiles.saveIntake(learner, { building: "A clinic booking app", role: "frontend-developer", weeklyHours: 4 });
      await runs.startRun(learner);
      assert.equal((await topics.getTopicView(learner, retry)).lesson, null);
      await assert.rejects(topics.openLesson(learner, retry), /closed during the assessment/);
      console.log("ok - topic page: exercise runs, shared exercise, solution, hand-written proof prompt, closed-book");
    } finally {
      await db().delete(users).where(eq(users.id, learner));
    }
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
