import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { labDailySets, labExercises, labProgress, labQuestions, labRunAnswers, labTopicEvents, users } from "../src/lib/schema";
import { ownerDay } from "../src/lib/day";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Engineering, with no AI calls. Throwaway users keep the owner's record untouched.
// Spec: docs/architecture/engineering-rebuild.md. Run with: pnpm --filter @ken-os/web test:db:engineering
async function main() {
  const store = await import("../src/features/engineering-lab/store");
  const runs = await import("../src/features/engineering-lab/assessment-store");
  const profiles = await import("../src/features/engineering-lab/profile-store");
  const topics = await import("../src/features/engineering-lab/topic-store");
  const practice = await import("../src/features/engineering-lab/practice-store");
  const exercises = await import("../src/features/engineering-lab/exercise-store");
  const tools = await import("../src/features/engineering-lab/agent-tools");

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
    // Profile (section 5). A brand-new owner: Developing everywhere, no made-up levels.
    const fresh = await profiles.getProfileView(other);
    assert.equal(fresh.direction, null);
    assert.equal(fresh.lastAssessed, null);
    assert.ok(fresh.rows.every((row) => row.level === null && row.coverage.proven === 0));
    assert.equal(fresh.milestone, null);
    // The owner proved Retry & backoff and aims at Full-stack developer with applied AI.
    await profiles.saveDirection(owner, { role: "fullstack-applied-ai", weeklyHours: 5 });
    const mine = await profiles.getProfileView(owner);
    assert.equal(mine.direction?.id, "fullstack-applied-ai");
    assert.ok(mine.lastAssessed, "the finished assessment is the last assessed date");
    assert.equal(mine.history.length, 2, "both assessments are in history, the open retake too");
    assert.ok(mine.openRunId, "the retake is open");
    const production = mine.rows.find((row) => row.area === "production")!;
    assert.ok(production.coverage.proven <= 1);
    assert.ok(mine.rows.every((row) => row.level === null), "one proven topic reaches no level, and the assessment never sets one");
    assert.equal(mine.overall, null);
    assert.ok(mine.milestone && mine.milestone.topicId, "the next milestone names a topic");
    assert.ok(!production.remainingTopics.some((topic) => topic.id === "rel.retry_backoff"), "a proven topic is not remaining");
    console.log("ok - Profile: Developing before evidence, levels only from proven topics, history and milestone");
    // Practice (section 3). The owner's only topic is proven and not due yet: nothing to practice.
    assert.deepEqual(await practice.practiceCandidates(owner), []);
    await assert.rejects(practice.startPractice(owner), /Nothing to practice/);
    // A changed source for a proven topic puts it back into Practice without changing its state.
    await store.flagRecheck(owner, "rel.retry_backoff", { changedSinceLast: ["The guidance on jitter changed."], sources: [{ url: "https://aws.amazon.com/builders-library/" }] } as never);
    assert.deepEqual(await practice.practiceCandidates(owner), [{ topicId: "rel.retry_backoff", reason: "changed" }]);
    assert.equal((await store.getProgress(owner, "rel.retry_backoff")).state, "PROVEN");
    // Stand in for the Assessor: one stored question and today's set.
    const questionId = randomUUID();
    await db().insert(labQuestions).values({ id: questionId, userId: owner, topicId: "rel.retry_backoff", kind: "review", prompt: "**Retry storm.** What spreads retries out?", rubric: ["Adds jitter"], referenceAnswer: "Jitter.", promptVersion: "check", model: "none" });
    await db().insert(labDailySets).values({ userId: owner, day: ownerDay(), items: [{ topicId: "rel.retry_backoff", reason: "changed", questionId }] });
    const today = await practice.getPractice(owner);
    assert.equal(today?.items.length, 1);
    assert.equal(today?.done, false);
    assert.equal((await practice.startPractice(owner)).items[0].questionId, questionId, "the day's set stays the same");
    await assert.rejects(practice.answerPractice(owner, { questionId, answer: "short", selfRating: 3 }), /at least a sentence/);
    await assert.rejects(practice.answerPractice(owner, { questionId: "nope", answer: "Jitter spreads the retries.", selfRating: 3 }), /not in today/);
    await store.recordEvent(owner, { topicId: "rel.retry_backoff", kind: "review", questionId, answer: "Jitter spreads the retries.", selfRating: 3, label: "solid", rubric: [], feedback: "Right." });
    const after = await practice.getPractice(owner);
    assert.equal(after?.done, true);
    assert.ok(after?.items[0].answered?.nextReviewAt, "the grade sets the next review date");
    await assert.rejects(practice.answerPractice(owner, { questionId, answer: "Jitter spreads the retries.", selfRating: 3 }), /Already answered/);
    console.log("ok - Practice: candidates, re-check without a state change, stable daily set, one answer per item");
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

    // Claude through the connector's tool layer (engineering-claude-connector.md, sections 2 to 5).
    const viaClaude = `engineering-check-${randomUUID()}`;
    await db().insert(users).values({ id: viaClaude, email: `${viaClaude}@example.invalid`, name: "Engineering check (Claude)" });
    try {
      const call = (name: string, input: unknown) => tools.callAgentTool(viaClaude, name, input) as Promise<Record<string, any>>;
      const closures = "js.closures";
      const trusted = { title: "MDN closures", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures" };
      const lessonInput = {
        heading: "A closure keeps its scope", body: "A function remembers where it was made.", mentalModel: "A backpack of variables.",
        block: { kind: "code", content: "const add = (a) => (b) => a + b;", note: "add(1) keeps a." }, example: "A click handler that keeps its row id.",
        prove: ["Closures keep variables", "let makes one per loop", "Factories keep separate state"],
        sources: [trusted, { title: "A blog", url: "https://example.com/closures" }],
      };
      const savedLesson = await call("save_lesson", { topicId: closures, lesson: lessonInput });
      assert.deepEqual(savedLesson.droppedSources, ["Not on a trusted site: https://example.com/closures"]);
      assert.equal((await topics.getLesson(viaClaude, closures))?.source, "claude");
      assert.equal((await call("get_topic", { topicId: closures })).lesson.heading, "A closure keeps its scope");
      await assert.rejects(call("save_lesson", { topicId: "rel.retry_backoff", lesson: lessonInput }), /written by hand/);
      assert.equal(await store.generationsToday(viaClaude), 0, "Claude's writes don't use Ken OS AI uses");
      console.log("ok - connector: Claude's lesson is saved with trusted sources only, hand-written lessons stay");

      const exerciseInput = (starter: string) => ({
        runner: "browser", task: "Make counter() count.", tests: "test('counts', () => { const c = counter(); c(); assert.equal(c(), 2); });",
        starter, solution: "function counter() { let n = 0; return () => ++n; }",
      });
      const v1 = await call("save_exercise", { topicId: closures, exercise: exerciseInput("function counter() { return () => 2; }") });
      assert.equal(v1.version, 1);
      let topic = await call("get_topic", { topicId: closures });
      assert.equal(topic.exercise.labId, "closure-loop", "an unchecked version never shows; the repo lab stays version 0");
      assert.equal(topic.uncheckedExercise.labId, v1.labId);
      assert.ok(!JSON.stringify(topic).includes("let n = 0"), "get_topic never returns a solution");
      const closuresTopic = store.requireTopic(closures);
      assert.equal((await exercises.getExercisePanel(viaClaude, closuresTopic)).check?.id, v1.labId, "the page checks it");
      await assert.rejects(topics.recordExerciseRun(viaClaude, closures, { labId: v1.labId, code: "", passed: 1, failed: 0, output: "" }), /doesn't check out/);
      const pass = [{ name: "counts", passed: true }];
      const fail = [{ name: "counts", passed: false, error: "Expected 2, got 1" }];
      await exercises.recordCheck(viaClaude, closures, v1.labId, { solution: { results: pass }, starter: { results: pass } });
      topic = await call("get_topic", { topicId: closures });
      assert.match(topic.invalidExercise.problem, /starter already passes/, "get_topic reports an invalid version so Claude can fix it");
      assert.equal(topic.exercise.labId, "closure-loop");

      const v2 = await call("save_exercise", { topicId: closures, exercise: exerciseInput("function counter() { return () => 0; }") });
      await exercises.recordCheck(viaClaude, closures, v2.labId, { solution: { results: pass }, starter: { results: fail } });
      await assert.rejects(exercises.recordCheck(viaClaude, closures, v2.labId, { solution: { results: fail }, starter: { results: fail } }), /already checked/);
      topic = await call("get_topic", { topicId: closures });
      assert.equal(topic.exercise.labId, v2.labId, "the newest valid version is the default");
      assert.equal(topic.invalidExercise, null);
      await exercises.saveDraft(viaClaude, closures, { labId: v2.labId, code: "function counter() { let n = 0; return () => n; }" });
      let work = await call("get_my_work", { topicId: closures });
      assert.match(work.code, /return \(\) => n;/, "Claude reads the autosaved code");
      await topics.recordExerciseRun(viaClaude, closures, { labId: v2.labId, code: work.code, passed: 0, failed: 1, output: "FAIL counts", tests: fail });
      work = await call("get_my_work", { topicId: closures });
      assert.deepEqual(work.lastRun.failing, [{ name: "counts", error: "Expected 2, got 1" }], "and the failing test's expected and actual");
      const [locked] = await db().select().from(labExercises).where(eq(labExercises.id, v2.labId));
      assert.ok(locked.lockedAt, "the first run locks the version");
      console.log("ok - connector: exercise versions are checked before they show, invalid ones are reported, the first run locks");

      await topics.recordExerciseRun(viaClaude, closures, { labId: v2.labId, code: "...", passed: 1, failed: 0, output: "", tests: pass });
      const v3 = await call("save_exercise", { topicId: closures, exercise: exerciseInput("function counter() {}") });
      await exercises.recordCheck(viaClaude, closures, v3.labId, { solution: { results: pass }, starter: { error: "c is not a function" } });
      topic = await call("get_topic", { topicId: closures });
      assert.equal(topic.exercise.labId, v2.labId, "a version the owner ran stays theirs");
      assert.equal(topic.newerExercise.labId, v3.labId);
      assert.equal(topic.exercisePassed, true);
      await assert.rejects(exercises.switchExercise(viaClaude, closures, v1.labId), /No newer exercise/);
      assert.equal((await exercises.switchExercise(viaClaude, closures, v3.labId)).exercisePassed, false, "switching starts a fresh attempt");
      assert.equal((await call("get_topic", { topicId: closures })).exercise.labId, v3.labId);
      const history = await call("get_history", { topicId: closures });
      assert.deepEqual(history.exerciseRuns, [{ labId: v2.labId, version: 2, runs: 2, passed: 1 }], "runs stay with their version");
      console.log("ok - connector: a newer version waits for Switch, which starts a fresh attempt");

      await assert.rejects(call("save_proof_question", { topicId: closures, prompt: "Why does let fix the loop?", pointIds: ["p9"] }), /Not a point on js.closures: p9/);
      const question = await call("save_proof_question", { topicId: closures, prompt: "Why does let fix the loop?", pointIds: ["p2"] });
      assert.deepEqual(question.tests, [closuresTopic.points[1]], "the rubric is the approved point it names");
      await topics.recordExerciseRun(viaClaude, closures, { labId: v3.labId, code: "...", passed: 1, failed: 0, output: "" });
      const claudeProof = await topics.getOrWriteProof(viaClaude, closures);
      assert.equal(claudeProof.prompt, "Why does let fix the loop?", "Ken OS asks Claude's question and grades it itself");
      assert.equal((await store.getProgress(viaClaude, closures)).state, "PRACTICING", "nothing Claude saves proves a topic");
      const claudeEvents = await db().select({ kind: labTopicEvents.kind }).from(labTopicEvents).where(and(eq(labTopicEvents.userId, viaClaude), eq(labTopicEvents.source, "claude")));
      assert.deepEqual([...new Set(claudeEvents.map((row) => row.kind))].sort(), ["exercise_saved", "lesson_saved", "proof_question_saved"]);
      console.log("ok - connector: proof questions name approved points, Ken OS grades, every write is recorded as Claude's");

      const state = await call("get_current_state", {});
      assert.equal(state.current.topicId, closures, "the topic in progress is current");
      assert.equal(state.current.step, "prove");
      assert.equal(state.aiUsesLeft, store.DAILY_GENERATION_LIMIT);
      assert.ok((await call("list_path", {})).chapters.length > 0);
      await profiles.saveIntake(viaClaude, { building: "A clinic booking app", role: "frontend-developer", weeklyHours: 4 });
      await runs.startRun(viaClaude);
      assert.equal((await call("get_current_state", {})).assessmentOpen, true);
      await assert.rejects(call("get_topic", { topicId: closures }), /assessment is open/);
      await assert.rejects(call("save_exercise", { topicId: closures, exercise: exerciseInput("") }), /assessment is open/);
      console.log("ok - connector: current state and path read; an open assessment closes the rest");
    } finally {
      await db().delete(users).where(eq(users.id, viaClaude));
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
