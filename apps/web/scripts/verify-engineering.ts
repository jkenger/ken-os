import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { labExercises, labProfile, labProgress, labRoadmaps, labTopicEvents, users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for Engineering, with no AI calls. Throwaway users keep the owner's record untouched.
// Spec: docs/architecture/engineering-claude-first.md. Run with: pnpm --filter @ken-os/web test:db:engineering
async function main() {
  const store = await import("../src/features/engineering-lab/store");
  const topics = await import("../src/features/engineering-lab/topic-store");
  const exercises = await import("../src/features/engineering-lab/exercise-store");
  const tools = await import("../src/features/engineering-lab/agent-tools");
  const statuses = await import("../src/features/engineering-lab/status-store");
  const roadmaps = await import("../src/features/engineering-lab/roadmap-store");
  const anyTopic = await import("../src/features/engineering-lab/any-topic");

  const owner = `engineering-check-${randomUUID()}`;
  const other = `engineering-check-${randomUUID()}`;
  await db()
    .insert(users)
    .values([
      { id: owner, email: `${owner}@example.invalid`, name: "Engineering check" },
      { id: other, email: `${other}@example.invalid`, name: "Engineering check (other)" },
    ]);
  try {
    // Exercise runs (section 1, Try it in code): passes, the solution, and an exercise shared by two topics.
    const retry = "rel.retry_backoff";
    await assert.rejects(
      store.recordEvent(owner, { topicId: "js.async_races", kind: "lesson_opened" }),
      /Unknown topic/,
    );
    await assert.rejects(
      topics.recordExerciseRun(owner, retry, { labId: "closure-loop", code: "", passed: 1, failed: 0, output: "" }),
      /another topic/,
    );
    let ran = await topics.recordExerciseRun(owner, retry, {
      labId: "retry-policy",
      code: "function retryDelay() { return 1000; }",
      passed: 1,
      failed: 3,
      output: "",
      tests: [{ name: "doubles", passed: false, error: "Expected 2000, got 1000" }],
    });
    assert.equal(ran.passed, false);
    ran = await topics.recordExerciseRun(owner, retry, {
      labId: "retry-policy",
      code: "...",
      passed: 4,
      failed: 0,
      output: "",
    });
    assert.equal(ran.progress.exercisePassed, true);
    const { solution } = await topics.openSolution(owner, retry, "retry-policy");
    assert.match(solution, /Math\.min/);
    assert.equal(
      (await store.getProgress(owner, retry)).exercisePassed,
      false,
      "opening the solution means passing again",
    );
    const [cached] = await db()
      .select()
      .from(labProgress)
      .where(and(eq(labProgress.userId, owner), eq(labProgress.topicId, retry)));
    assert.equal(cached.status, "PRACTICING", "lab_progress caches the rebuilt progress");
    await topics.recordExerciseRun(owner, "js.promises", {
      labId: "event-loop-order",
      code: "...",
      passed: 3,
      failed: 0,
      output: "",
    });
    assert.equal(
      (await store.getProgress(owner, "js.event_loop")).exercisePassed,
      true,
      "a shared exercise counts for both",
    );
    assert.equal((await statuses.topicStatus(owner, retry)).status, "in_progress", "old activity is In progress");
    assert.equal((await statuses.topicStatus(other, retry)).status, "not_started", "statuses are per owner");
    console.log("ok - exercise runs: passes, the solution, a shared exercise, and statuses per owner");

    // Claude through the connector's tool layer (engineering-claude-connector.md, sections 2 to 5).
    const viaClaude = `engineering-check-${randomUUID()}`;
    await db()
      .insert(users)
      .values({ id: viaClaude, email: `${viaClaude}@example.invalid`, name: "Engineering check (Claude)" });
    try {
      const call = (name: string, input: unknown) =>
        tools.callAgentTool(viaClaude, name, input) as Promise<Record<string, any>>;
      const closures = "js.closures";
      // Reports and notes (engineering-claude-first.md, sections 2 and 4).
      assert.equal((await call("get_topic", { topicId: closures })).status, "not_started");
      const first = await call("report_progress", { topicId: closures, summary: "Asked what a closure keeps" });
      assert.equal(first.status, "in_progress", "the first report starts the topic");
      await call("save_note", { topicId: closures, body: "Say it captures the variable, not its value" });
      const ownerNote = await statuses.addNote(viaClaude, closures, "owner", "let vs var still fuzzy");
      const started = await call("get_topic", { topicId: closures });
      assert.equal(started.reports[0].summary, "Asked what a closure keeps");
      assert.deepEqual(started.notes.map((note: { author: string }) => note.author).sort(), ["claude", "owner"]);
      assert.equal(
        (await statuses.editNote(viaClaude, ownerNote.id, "let makes a new binding per loop")).body,
        "let makes a new binding per loop",
      );
      console.log("ok - connector: a report starts the topic, notes are kept per author");

      const exerciseInput = (starter: string) => ({
        runner: "browser",
        task: "Make counter() count.",
        tests: "test('counts', () => { const c = counter(); c(); assert.equal(c(), 2); });",
        starter,
        solution: "function counter() { let n = 0; return () => ++n; }",
      });
      const v1 = await call("save_exercise", {
        topicId: closures,
        exercise: exerciseInput("function counter() { return () => 2; }"),
      });
      assert.equal(v1.version, 1);
      let topic = await call("get_topic", { topicId: closures });
      assert.equal(
        topic.exercise.labId,
        "closure-loop",
        "an unchecked version never shows; the repo lab stays version 0",
      );
      assert.equal(topic.uncheckedExercise.labId, v1.labId);
      assert.ok(!JSON.stringify(topic).includes("let n = 0"), "get_topic never returns a solution");
      const closuresTopic = store.requireTopic(closures);
      assert.equal(
        (await exercises.getExercisePanel(viaClaude, closuresTopic)).check?.id,
        v1.labId,
        "the page checks it",
      );
      await assert.rejects(
        topics.recordExerciseRun(viaClaude, closures, { labId: v1.labId, code: "", passed: 1, failed: 0, output: "" }),
        /doesn't check out/,
      );
      const pass = [{ name: "counts", passed: true }];
      const fail = [{ name: "counts", passed: false, error: "Expected 2, got 1" }];
      await exercises.recordCheck(viaClaude, closures, v1.labId, {
        solution: { results: pass },
        starter: { results: pass },
      });
      topic = await call("get_topic", { topicId: closures });
      assert.match(
        topic.invalidExercise.problem,
        /starter already passes/,
        "get_topic reports an invalid version so Claude can fix it",
      );
      assert.equal(topic.exercise.labId, "closure-loop");

      const v2 = await call("save_exercise", {
        topicId: closures,
        exercise: exerciseInput("function counter() { return () => 0; }"),
      });
      await exercises.recordCheck(viaClaude, closures, v2.labId, {
        solution: { results: pass },
        starter: { results: fail },
      });
      await assert.rejects(
        exercises.recordCheck(viaClaude, closures, v2.labId, {
          solution: { results: fail },
          starter: { results: fail },
        }),
        /already checked/,
      );
      topic = await call("get_topic", { topicId: closures });
      assert.equal(topic.exercise.labId, v2.labId, "the newest valid version is the default");
      assert.equal(topic.invalidExercise, null);
      await exercises.saveDraft(viaClaude, closures, {
        labId: v2.labId,
        code: "function counter() { let n = 0; return () => n; }",
      });
      let work = await call("get_my_work", { topicId: closures });
      assert.match(work.code, /return \(\) => n;/, "Claude reads the autosaved code");
      await topics.recordExerciseRun(viaClaude, closures, {
        labId: v2.labId,
        code: work.code,
        passed: 0,
        failed: 1,
        output: "FAIL counts",
        tests: fail,
      });
      work = await call("get_my_work", { topicId: closures });
      assert.deepEqual(
        work.lastRun.failing,
        [{ name: "counts", error: "Expected 2, got 1" }],
        "and the failing test's expected and actual",
      );
      const [locked] = await db().select().from(labExercises).where(eq(labExercises.id, v2.labId));
      assert.ok(locked.lockedAt, "the first run locks the version");
      console.log(
        "ok - connector: exercise versions are checked before they show, invalid ones are reported, the first run locks",
      );

      await topics.recordExerciseRun(viaClaude, closures, {
        labId: v2.labId,
        code: "...",
        passed: 1,
        failed: 0,
        output: "",
        tests: pass,
      });
      const v3 = await call("save_exercise", { topicId: closures, exercise: exerciseInput("function counter() {}") });
      await exercises.recordCheck(viaClaude, closures, v3.labId, {
        solution: { results: pass },
        starter: { error: "c is not a function" },
      });
      topic = await call("get_topic", { topicId: closures });
      assert.equal(topic.exercise.labId, v2.labId, "a version the owner ran stays theirs");
      assert.equal(topic.newerExercise.labId, v3.labId);
      assert.equal((await store.getProgress(viaClaude, closures)).exercisePassed, true);
      await assert.rejects(exercises.switchExercise(viaClaude, closures, v1.labId), /No newer exercise/);
      assert.equal(
        (await exercises.switchExercise(viaClaude, closures, v3.labId)).exercisePassed,
        false,
        "switching starts a fresh attempt",
      );
      assert.equal((await call("get_topic", { topicId: closures })).exercise.labId, v3.labId);
      const history = await call("get_history", { topicId: closures });
      assert.deepEqual(
        history.exerciseRuns,
        [{ labId: v2.labId, version: 2, runs: 2, passed: 1 }],
        "runs stay with their version",
      );
      console.log("ok - connector: a newer version waits for Switch, which starts a fresh attempt");

      const evidence = {
        explanation:
          "A closure keeps access to the variables of the scope where it was made, not copies of their values.",
        note: "Unaided, after the exercise",
      };
      await assert.rejects(
        call("report_progress", { topicId: closures, summary: "Got it", status: "learned" }),
        /Learned needs evidence/,
      );
      await assert.rejects(
        call("report_progress", {
          topicId: closures,
          summary: "Got it",
          status: "learned",
          evidence: { explanation: "It keeps vars", note: "Unaided" },
        }),
        /Learned needs evidence/,
        "a few words aren't an explanation",
      );
      const learned = await call("report_progress", {
        topicId: closures,
        summary: "Explained closures unaided",
        status: "learned",
        evidence,
      });
      assert.equal(learned.status, "learned");
      assert.match((await statuses.listReports(viaClaude, closures))[0].evidence!, /not copies of their values/);
      assert.equal((await store.getProgress(viaClaude, closures)).state, "PRACTICING", "the old progress is untouched");
      await assert.rejects(statuses.setStatus(viaClaude, closures, "learned"), /one line on why/);
      assert.equal((await statuses.setStatus(viaClaude, closures, "not_started")).setBy, "owner", "the owner can undo");
      await assert.rejects(
        call("report_progress", { topicId: closures, summary: "Explained again", status: "learned", evidence }),
        /Only they can change it/,
      );
      assert.equal(
        (await call("report_progress", { topicId: closures, summary: "Back on closures" })).status,
        "in_progress",
        "a fresh report restarts a reset topic",
      );
      await statuses.setStatus(viaClaude, closures, "skipped");
      await assert.rejects(
        call("report_progress", { topicId: closures, summary: "Learned", status: "learned", evidence }),
        /Only they can change it/,
      );
      assert.equal((await statuses.deleteNote(viaClaude, ownerNote.id)).deleted, true);
      const claudeEvents = await db()
        .select({ kind: labTopicEvents.kind })
        .from(labTopicEvents)
        .where(and(eq(labTopicEvents.userId, viaClaude), eq(labTopicEvents.source, "claude")));
      assert.deepEqual([...new Set(claudeEvents.map((row) => row.kind))].sort(), ["exercise_saved", "report"]);
      console.log(
        "ok - connector: Learned needs the owner's words, the owner's status stays theirs, every write is Claude's",
      );

      const state = await call("get_current_state", {});
      assert.equal(
        state.current.topicId,
        "js.call_stack",
        "with nothing in progress, the first topic not started is current",
      );
      assert.equal(state.current.status, "not_started");
      assert.equal(state.counts.skipped, 1);
      assert.ok((await call("get_roadmap", {})).chapters.length > 0);
      console.log("ok - connector: current state and roadmap read");
    } finally {
      await db().delete(users).where(eq(users.id, viaClaude));
    }

    // Planning with Claude (engineering-claude-first.md, section 3).
    const planner = `engineering-check-${randomUUID()}`;
    await db()
      .insert(users)
      .values({ id: planner, email: `${planner}@example.invalid`, name: "Engineering check (planner)" });
    try {
      const call = (name: string, input: unknown) =>
        tools.callAgentTool(planner, name, input) as Promise<Record<string, any>>;
      assert.equal((await call("get_current_state", {})).planned, false, "no roadmap yet: the default path");
      await call("report_progress", { topicId: "react.effects", summary: "Started effects" });
      await assert.rejects(
        call("save_roadmap", { goal: "AI engineer", chapters: [{ chapterId: "nope", topics: ["react.effects"] }] }),
        /no chapter "nope"/,
      );
      const judge = {
        title: "LLM as judge",
        explain: ["What a judge model scores", "Why it drifts", "How to calibrate it"],
      };
      const first = await call("save_roadmap", {
        goal: "AI engineer",
        chapters: [
          { chapterId: "react", topics: ["react.effects"] },
          { title: "Evals in practice", topics: [judge] },
        ],
      });
      assert.deepEqual(first.addedTopics, [{ topicId: "custom.llm_as_judge", title: "LLM as judge" }]);
      let roadmap = await call("get_roadmap", {});
      assert.equal(roadmap.planned, true);
      assert.equal(roadmap.goal.title, "AI engineer");
      assert.deepEqual(
        roadmap.chapters.map((chapter: { title: string; topics: { topicId: string; status: string }[] }) => [
          chapter.title,
          chapter.topics.map((topic) => `${topic.topicId}:${topic.status}`),
        ]),
        [
          ["React", ["react.effects:in_progress"]],
          ["Evals in practice", ["custom.llm_as_judge:not_started"]],
        ],
        "progress from before the plan carries over",
      );
      const added = await call("get_topic", { topicId: "custom.llm_as_judge" });
      assert.equal(added.addedByClaude, true);
      assert.equal(added.chapter, "Evals in practice");
      assert.equal(added.points[0].text, "What a judge model scores");
      assert.equal(added.exercise, null, "Claude's topics start without an exercise");
      assert.equal((await call("get_my_work", { topicId: "custom.llm_as_judge" })).labId, null);
      await call("report_progress", { topicId: "custom.llm_as_judge", summary: "Talked through judges" });
      await call("save_note", { topicId: "custom.llm_as_judge", body: "Say rubric, not vibe check" });
      const panel = await roadmaps.getTopicPanel(planner, "custom.llm_as_judge");
      assert.equal(panel.status.status, "in_progress");
      assert.equal(panel.notes.length, 1);
      const saved = await call("save_exercise", {
        topicId: "custom.llm_as_judge",
        exercise: {
          runner: "browser",
          task: "Score two answers.",
          starter: "function score() { return 0; }",
          tests: "test('scores', () => { assert.equal(score(), 1); });",
          solution: "function score() { return 1; }",
        },
      });
      const judgeTopic = await anyTopic.requireAnyTopic(planner, "custom.llm_as_judge");
      assert.equal(
        (await exercises.getCodePanel(planner, judgeTopic)).pending?.id,
        saved.labId,
        "the page checks it first",
      );
      await exercises.recordCheck(planner, "custom.llm_as_judge", saved.labId, {
        solution: { results: [{ name: "scores", passed: true }] },
        starter: { results: [{ name: "scores", passed: false }] },
      });
      assert.equal((await exercises.getCodePanel(planner, judgeTopic)).exercise?.exercise.id, saved.labId);
      await topics.recordExerciseRun(planner, "custom.llm_as_judge", {
        labId: saved.labId,
        code: "...",
        passed: 1,
        failed: 0,
        output: "",
      });
      assert.equal((await store.getProgress(planner, "custom.llm_as_judge")).exercisePassed, true);
      console.log(
        "ok - planning: Claude saves a roadmap with its own topic, which takes reports, notes and an exercise",
      );

      const second = await call("save_roadmap", {
        goal: "Frontend engineer",
        chapters: [{ title: "Evals again", topics: ["custom.llm_as_judge", judge] }],
      });
      assert.deepEqual(second.addedTopics, [{ topicId: "custom.llm_as_judge_2", title: "LLM as judge" }]);
      roadmap = await call("get_roadmap", {});
      assert.equal(roadmap.goal.title, "Frontend engineer");
      assert.equal(roadmap.chapters[0].topics[0].status, "in_progress", "a topic keeps its progress across roadmaps");
      const archived = await db().select().from(labRoadmaps).where(eq(labRoadmaps.userId, planner));
      assert.deepEqual(
        archived.map((row) => row.status).sort(),
        ["active", "archived"],
        "the old roadmap is archived, not deleted",
      );
      await assert.rejects(call("get_topic", { topicId: "custom.not_mine" }), /Unknown topic/);
      await assert.rejects(
        tools.callAgentTool(other, "get_topic", { topicId: "custom.llm_as_judge" }),
        /Unknown topic/,
        "Claude's topics are per owner",
      );
      console.log("ok - planning: a new roadmap archives the old one, and topics keep their progress");

      // Links into Claude, set in the app (section 9e).
      const links = await import("../src/features/engineering-lab/claude-links");
      const savedEnv = process.env.KEN_OS_CLAUDE_PROJECT_URL;
      process.env.KEN_OS_CLAUDE_PROJECT_URL = "https://claude.ai/project/from-env";
      try {
        assert.equal(
          await links.getProjectUrl(planner),
          "https://claude.ai/project/from-env",
          "the env link is the fallback",
        );
        await assert.rejects(links.setProjectUrl(planner, "https://evil.example/p"), /https claude.ai link/);
        await links.setProjectUrl(planner, "https://claude.ai/code/project/chan_1");
        assert.equal(
          await links.getProjectUrl(planner),
          "https://claude.ai/code/project/chan_1",
          "the saved link wins",
        );
        assert.equal((await db().select().from(labProfile).where(eq(labProfile.userId, planner)))[0].direction, null);
        await links.setProjectUrl(planner, "");
        assert.equal(
          await links.getProjectUrl(planner),
          "https://claude.ai/project/from-env",
          "clearing falls back again",
        );
      } finally {
        process.env.KEN_OS_CLAUDE_PROJECT_URL = savedEnv;
      }
      await assert.rejects(
        links.setTopicChat(planner, "react.effects", "https://chat.openai.com/c/1"),
        /https claude.ai link/,
      );
      await assert.rejects(links.setTopicChat(planner, "custom.not_mine", "https://claude.ai/chat/1"), /Unknown topic/);
      await links.setTopicChat(planner, "custom.llm_as_judge", "https://claude.ai/chat/judge-1");
      assert.equal(
        (await roadmaps.getTopicPanel(planner, "custom.llm_as_judge")).chatUrl,
        "https://claude.ai/chat/judge-1",
      );
      await links.setTopicChat(planner, "custom.llm_as_judge", "https://claude.ai/chat/judge-2");
      assert.equal(
        await links.getTopicChat(planner, "custom.llm_as_judge"),
        "https://claude.ai/chat/judge-2",
        "relinking replaces it",
      );
      assert.equal(await links.getTopicChat(other, "custom.llm_as_judge"), null, "chat links are per owner");
      await links.setTopicChat(planner, "custom.llm_as_judge", "");
      assert.equal(await links.getTopicChat(planner, "custom.llm_as_judge"), null);
      console.log("ok - links: the Project link is saved in the app over the env, and each topic can link a chat");

      // The instructions version Claude reports (engineering-progressive-flow.md, section 1).
      assert.deepEqual(await links.getInstructionsSeen(planner), { version: null, seenAt: null }, "none reported yet");
      await call("get_current_state", { instructionsVersion: "not a date" });
      assert.equal((await links.getInstructionsSeen(planner)).version, null, "only a YYYY-MM-DD version is kept");
      await call("get_current_state", { instructionsVersion: "2026-10-01" });
      const reported = await links.getInstructionsSeen(planner);
      assert.equal(reported.version, "2026-10-01");
      assert.ok(reported.seenAt);
      await call("get_current_state", {});
      await call("get_current_state", { instructionsVersion: "2026-10-01" });
      assert.deepEqual(
        await links.getInstructionsSeen(planner),
        reported,
        "no version or the same one changes nothing",
      );
      await call("get_current_state", { instructionsVersion: "2026-10-13" });
      assert.equal((await links.getInstructionsSeen(planner)).version, "2026-10-13", "a new paste replaces it");
      assert.equal((await links.getInstructionsSeen(other)).version, null, "versions are per owner");
      await assert.rejects(call("get_current_state", { instructionsVersion: "x".repeat(21) }), /instructionsVersion/);
      console.log("ok - setup: get_current_state keeps the instructions version Claude reports");
    } finally {
      await db().delete(users).where(eq(users.id, planner));
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
