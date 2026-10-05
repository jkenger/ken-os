import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import type { AssessmentItem } from "@ken-os/domain";
import { closeDb, db } from "../src/lib/db";
import { labAssessments, labChapterScreens, labRadarItems, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for the in-app baseline and the career profile, with no AI calls: questions are inserted directly
// and screening grades are written as the grader would. A throwaway user keeps the owner's record untouched.
// Design: docs/architecture/engineering-lab-profile.md.
async function main() {
  const store = await import("../src/features/engineering-lab/store");
  const runs = await import("../src/features/engineering-lab/assessment-run");
  const state = await import("../src/features/engineering-lab/run-state");
  const profiles = await import("../src/features/engineering-lab/profile-store");
  const daily = await import("../src/features/engineering-lab/daily");
  const userId = `profile-check-${randomUUID()}`;
  await db().insert(users).values({ id: userId, email: `${userId}@example.invalid`, name: "Profile check" });
  try {
    const before = await profiles.getProfileView(userId);
    assert.equal(before.baseline.state, "none");
    assert.equal((await store.getAllProgress(userId)).find((item) => item.topicId === "js.event_loop")?.baselineLabel, "misconception", "the old summary stands in until the run is done");
    await assert.rejects(profiles.chooseDirection(userId, "fullstack-developer"), /after your baseline/);
    await profiles.saveIntake(userId, profiles.validIntake({ building: "My own products", stack: "Next.js and Postgres", aiWork: "Embeddings", weeklyHours: 6 }));
    console.log("ok - fresh profile: no baseline, old summary stands in, intake saved, direction waits");

    const started = await runs.startRun(userId, "baseline");
    const again = await runs.startRun(userId, "baseline");
    assert.equal(again.id, started.id, "starting again resumes the open run");
    assert.equal(again.resumed, true);
    await assert.rejects(runs.startRun(userId, "checkpoint"), /Finish the baseline/);
    const run = (await state.activeRun(userId))!;
    console.log(`ok - run started with ${run.plan.chapters.length} chapters and resumes instead of duplicating`);

    // Stand-in for the Assessor: every topic gets two code-checked predictions.
    const predict = (n: number): AssessmentItem => ({ mode: "predict", prompt: `What prints? (${n})`, code: `console.log(${n})`, expectedOutput: [String(n)] });
    const sets = new Map<string, string>();
    for (const chapter of run.plan.chapters) {
      if (chapter.kind === "topics") {
        for (const topicId of chapter.topicIds) {
          const id = randomUUID();
          sets.set(topicId, id);
          await db().insert(labAssessments).values({ id, userId, topicId, kind: "baseline", items: [predict(1), predict(2)], promptVersion: "check", model: "none", origin: "run", runId: run.id });
        }
      } else {
        await db().insert(labChapterScreens).values([0, 1].map((itemIndex) => ({
          id: randomUUID(), userId, setId: run.id, runId: run.id, chapterId: chapter.chapterId, itemIndex,
          item: { mode: "explain" as const, prompt: `Screen ${itemIndex}`, code: null, rubric: ["point"], misconceptionsToWatch: [] }, promptVersion: "check", model: "none",
        })));
      }
    }

    await assert.rejects(store.generateLesson(userId, "js.event_loop"), (error: Error) => error instanceof store.LabInputError && error.status === 409, "lessons stay closed during the run");
    assert.equal((await store.getTopicView(userId, "js.event_loop")).closedBook, true);
    assert.equal((await store.getTopicView(userId, "js.event_loop")).assessment, null, "run questions never show on the topic page");
    const loopSet = sets.get("js.event_loop")!;
    await assert.rejects(
      store.submitAnswer(userId, { assessmentId: loopSet, itemIndex: 1, selfRating: 3, response: { lines: ["2"] }, actualOutput: ["2"] }),
      /in the order/, "the run decides which question comes next",
    );
    console.log("ok - closed-book: lessons blocked, run questions hidden from topic pages, answers only in the run's order");

    // Answer every topic: solid twice, except the event loop (wrong twice: a probe follows the first) and closures (solid, then wrong).
    let finished = false;
    for (const [topicId, assessmentId] of sets) {
      const first = await store.submitAnswer(userId, { assessmentId, itemIndex: 0, selfRating: 4, response: { lines: topicId === "js.event_loop" ? ["9"] : ["1"] }, actualOutput: ["1"] });
      if (topicId === "js.event_loop") {
        assert.notEqual(first.grade.label, "solid");
        assert.equal(await state.nextRunItem(db(), { id: assessmentId, items: [predict(1), predict(2)] }), 1, "a partly right answer gets a probing follow-up");
        finished = (await store.submitAnswer(userId, { assessmentId, itemIndex: 1, selfRating: 2, response: { lines: ["9"] }, actualOutput: ["2"] })).runFinished;
        continue;
      }
      const second = await store.submitAnswer(userId, { assessmentId, itemIndex: 1, selfRating: 4, response: { lines: topicId === "js.closures" ? ["7"] : ["2"] }, actualOutput: ["2"] });
      finished = second.runFinished;
    }
    const loopNext = await state.nextRunItem(db(), { id: loopSet, items: [predict(1), predict(2)] });
    assert.equal(loopNext, null, "two answers is the most a topic gets");
    // Every chapter is written, so the baseline has no screening chapters: the last topic answer finishes the run.
    assert.equal(run.plan.chapters.some((chapter) => chapter.kind !== "topics"), false);
    assert.equal(finished, true, "the run finishes once every topic is answered");
    assert.ok(await state.completedBaseline(userId));
    console.log("ok - adaptive answers, and the run finishes when every chapter is done");

    const progress = await store.getAllProgress(userId);
    const of = (id: string) => progress.find((item) => item.topicId === id)!;
    assert.equal(of("js.call_stack").placement, "passed", "two solid answers place a topic");
    assert.equal(of("js.call_stack").baselineLabel, "solid");
    assert.notEqual(of("js.event_loop").baselineLabel, "misconception", "the old summary is gone; the label comes from the run");
    assert.equal(of("js.closures").placement, "failed");
    assert.equal((await store.baselineEntryFor(userId, "js.call_stack"))?.label, "solid", "the Tutor reads the run's result");
    assert.equal((await store.getTopicView(userId, "js.event_loop")).closedBook, false, "lessons open again");
    assert.equal((await store.baselineInfo(userId)).source, "run");
    console.log("ok - the in-app baseline replaces the old summary everywhere: labels, placement, Tutor input, topic pages");

    const view = await runs.getRunView(userId, run.id);
    assert.ok(view.completedAt);
    assert.ok(view.chapters.every((chapter) => chapter.status === "done"));
    assert.ok(view.chapters.find((chapter) => chapter.chapterId === "m1-js-runtime")!.answers.length > 0, "every question and answer is visible once done");
    await assert.rejects(runs.startRun(userId, "baseline"), /already taken/);
    console.log("ok - the finished run shows every answer, and the baseline can't be taken twice");

    await profiles.chooseDirection(userId, "fullstack-applied-ai");
    const profile = await profiles.getProfileView(userId);
    assert.equal(profile.baseline.state, "done");
    assert.equal(profile.direction, "fullstack-applied-ai");
    const foundations = profile.areas.find((area) => area.area === "foundations")!;
    assert.ok(foundations.atBaseline, "levels at the baseline are kept for comparison");
    const ai = profile.areas.find((area) => area.area === "ai")!;
    assert.equal(ai.now.estimate, false, "the AI chapters are written and answered topic by topic, so it isn't an estimate");
    assert.ok(profile.roadmap.length > 0 && profile.roadmap[0].forLevel === "junior");
    assert.ok(profile.roles.every((role) => role.missing.length >= 0));
    console.log(`ok - profile: foundations ${foundations.now.level ?? "not yet junior"}, AI ${ai.now.level ?? "not yet junior"}, roadmap of ${profile.roadmap.length} chapters`);

    const added = await profiles.addChapter(userId, { title: "Payments", area: "backend", reason: "My products take payments." });
    await assert.rejects(profiles.addChapter(userId, { title: "Payments", area: "backend", reason: "Again." }), /already/);
    const withAdded = await profiles.getProfileView(userId);
    assert.equal(withAdded.addedChapters[0].id, added.id);
    assert.equal(withAdded.addedChapters[0].screened, false);
    console.log("ok - an approved chapter joins the profile unwritten and unassessed");

    const radarId = randomUUID();
    await db().insert(labRadarItems).values({ id: radarId, userId, week: profile.radar.week, area: "ai", tag: "experiment", title: "A new model", reason: "Cheaper.", sourceUrl: "https://platform.openai.com/docs" });
    assert.equal((await profiles.getProfileView(userId)).radar.items.length, 1);
    await profiles.dismissRadarItem(userId, radarId);
    assert.equal((await profiles.getProfileView(userId)).radar.items.length, 0);
    console.log("ok - radar items show for the week and can be dismissed");

    const checkpoint = await runs.startRun(userId, "checkpoint");
    assert.equal(checkpoint.resumed, false);
    const [checkpointRun] = await db().select().from((await import("../src/lib/schema")).labAssessmentRuns).where(and(eq((await import("../src/lib/schema")).labAssessmentRuns.id, checkpoint.id)));
    const runtime = checkpointRun.plan.chapters.find((chapter) => chapter.chapterId === "m1-js-runtime");
    assert.ok(runtime?.kind === "topics" && runtime.skipped.includes("js.call_stack"), "a checkpoint skips what's already known");
    assert.equal(await daily.getDailySet(userId), null);
    await assert.rejects(daily.generateDailySet(userId), /Finish your assessment/, "no daily practice during a run");
    console.log("ok - a checkpoint can start after the baseline and skips known topics; daily practice waits for it");
  } finally {
    await db().delete(users).where(eq(users.id, userId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
