import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import type { AssessmentItem } from "@ken-os/domain";
import { closeDb, db } from "../src/lib/db";
import { answerStageOne } from "./stage-one";
import { labAssessments, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for the Engineering redesign's new read paths, with no AI calls: evidence links are owner-only,
// results inside an unfinished assessment chapter stay hidden, and the Profile table agrees with the profile view.
// Throwaway users keep the owner's record untouched. Design: docs/architecture/engineering-redesign.md.
async function main() {
  const store = await import("../src/features/engineering-lab/store");
  const runs = await import("../src/features/engineering-lab/assessment-run");
  const state = await import("../src/features/engineering-lab/run-state");
  const profiles = await import("../src/features/engineering-lab/profile-store");
  const evidence = await import("../src/features/engineering-lab/evidence");
  const { capabilityRows, nextRequirement } = await import("../src/features/engineering-lab/capabilities");
  const { careers, topicMap } = await import("../src/features/engineering-lab/curriculum");
  const { labAttempts } = await import("../src/lib/schema");

  const owner = `engineering-check-${randomUUID()}`;
  const other = `engineering-check-${randomUUID()}`;
  await db().insert(users).values([
    { id: owner, email: `${owner}@example.invalid`, name: "Engineering check" },
    { id: other, email: `${other}@example.invalid`, name: "Engineering check (other)" },
  ]);
  try {
    await profiles.saveIntake(owner, profiles.validIntake({ building: "My own products", stack: "Next.js", aiWork: "Embeddings", weeklyHours: 6 }));
    const started = await runs.startRun(owner, "baseline");
    const run = (await state.activeRun(owner))!;
    assert.equal(run.id, started.id);

    // Stand-in for the Assessor: the first chapter's first topic gets two code-checked predictions.
    const first = run.plan.chapters.find((chapter) => chapter.kind === "topics" && chapter.topicIds.length > 1);
    assert.ok(first && first.kind === "topics");
    const predict = (n: number): AssessmentItem => ({ mode: "predict", prompt: `What prints? (${n})`, code: `console.log(${n})`, expectedOutput: [String(n)] });
    const setId = randomUUID();
    await db().insert(labAssessments).values({ id: setId, userId: owner, topicId: first.topicIds[0], kind: "baseline", items: [predict(1), predict(2)], promptVersion: "check", model: "none", origin: "run", runId: run.id });
    await assert.rejects(
      store.submitAnswer(owner, { assessmentId: setId, itemIndex: 0, selfRating: 4, response: { lines: ["1"] }, actualOutput: ["1"] }),
      /first two questions/, "topic questions wait for the chapter's two stage-1 questions",
    );
    // One chapter is cleared in stage 1; every other written chapter digs into its topics.
    const cleared = run.plan.chapters.find((chapter) => chapter.chapterId === "architecture")!;
    for (const chapter of run.plan.chapters) await answerStageOne(owner, run.id, chapter, chapter === cleared ? "clear" : "drill");
    await store.submitAnswer(owner, { assessmentId: setId, itemIndex: 0, selfRating: 4, response: { lines: ["1"] }, actualOutput: ["1"] });
    const clearedView = (await runs.getRunView(owner, run.id)).chapters.find((chapter) => chapter.chapterId === cleared.chapterId)!;
    assert.equal(clearedView.status, "done");
    assert.equal(clearedView.cleared, true);
    assert.equal(clearedView.answers.length, 2, "stage-1 answers show in the run");
    console.log("ok - two stages: topic questions wait for stage 1; a cleared chapter is done without topic questions");
    const [attempt] = await db().select().from(labAttempts).where(eq(labAttempts.assessmentId, setId));
    assert.ok(attempt);

    const during = await evidence.getEvidence(owner, attempt.id);
    assert.ok(during);
    assert.equal(during.result.label, "solid", "grades show after every answer, also during the run (assessment v2, A3)");
    assert.deepEqual(during.question.expectedOutput, ["1"]);
    assert.equal(during.selfRating, 4, "confidence is recorded independently of the grade");
    assert.equal(during.role, "placement");
    assert.equal(during.source?.runKind, "baseline");
    assert.equal((await evidence.recentEvidence(owner)).length, 1, "recent evidence includes answers from the open run");
    console.log("ok - during the run: the evidence page shows the grade, and recent evidence lists the answer");

    assert.equal(await evidence.getEvidence(other, attempt.id), null, "another owner's id reads as missing");
    assert.equal(await evidence.getEvidence(owner, "no-such-attempt"), null);
    console.log("ok - evidence links are owner-only");

    // Finish the run: every full-stack topic solid twice, every AI topic wrong.
    for (const chapter of run.plan.chapters) {
      if (chapter.kind !== "topics" || chapter === cleared) continue;
      const wrong = topicMap.chapters.find((item) => item.id === chapter.chapterId)?.area === "ai";
      for (const topicId of chapter.topicIds) {
        const id = topicId === first.topicIds[0] ? setId : randomUUID();
        if (id !== setId) {
          await db().insert(labAssessments).values({ id, userId: owner, topicId, kind: "baseline", items: [predict(1), predict(2)], promptVersion: "check", model: "none", origin: "run", runId: run.id });
          await store.submitAnswer(owner, { assessmentId: id, itemIndex: 0, selfRating: 3, response: { lines: wrong ? ["9"] : ["1"] }, actualOutput: ["1"] });
        }
        // A wrong line grades as partly there, which asks one probing question; that one is wrong too.
        if (await state.nextRunItem(db(), { id, items: [predict(1), predict(2)] }) !== null) {
          await store.submitAnswer(owner, { assessmentId: id, itemIndex: 1, selfRating: 3, response: { lines: wrong ? ["9"] : ["2"] }, actualOutput: ["2"] });
        }
      }
    }
    assert.ok(await state.completedBaseline(owner), "the baseline finished");

    const after = await evidence.getEvidence(owner, attempt.id);
    assert.equal(after?.result?.label, "solid");
    assert.equal(after?.result?.gradedBy, "code");
    assert.deepEqual(after?.question.expectedOutput, ["1"]);
    const recent = await evidence.recentEvidence(owner, 6);
    assert.equal(recent.length, 6);
    assert.ok(recent.every((item) => item.role === "placement"));
    console.log("ok - after the run: grade, code check and answer key show, and recent evidence lists the run's answers");

    await profiles.chooseDirection(owner, "fullstack-applied-ai");
    const view = await profiles.getProfileView(owner);
    const rows = capabilityRows({ careers, map: topicMap, progress: view.progress, states: view.chapterStates, baselineStates: view.baselineChapterStates, roleId: view.direction });
    for (const row of rows) assert.equal(row.current, view.areas.find((area) => area.area === row.area)!.now.level, `${row.area} matches the profile view`);
    const role = view.roles.find((item) => item.roleId === view.direction)!;
    assert.equal(rows.filter((row) => row.target).reduce((sum, row) => sum + row.remaining, 0), role.missing.length, "the table counts the same gaps as the role distance");
    assert.ok(role.missing.length > 0, "the AI chapters were answered wrong, so the direction still has gaps");
    const next = nextRequirement(rows, view.direction);
    assert.ok(next && rows.find((row) => row.area === next.area)?.target, "the next milestone comes from an area the direction needs");
    assert.equal(rows.find((row) => row.area === "ai")!.current, null, "wrong answers never make an area junior");
    assert.ok(rows.every((row) => row.atBaseline === row.current), "right after the baseline, now and at-baseline agree");
    const architecture = view.chapterStates.find((state) => state.chapterId === "architecture")!;
    assert.equal(architecture.depth, "build", "a cleared chapter counts as can build it");
    assert.equal(architecture.estimate, true, "as an estimate");
    assert.equal(architecture.known, 0, "and proves no topic");
    console.log(`ok - Profile table agrees with levels and role distance (${role.missing.length} requirements left)`);
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
