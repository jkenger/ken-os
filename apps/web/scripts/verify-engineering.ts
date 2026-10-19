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
        task: "Make counter() count.\n\n```js\nconst c = counter();\nc();\nc();\n// → 2\n```",
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
          task: "Score two answers.\n\n```js\nscore();\n// → 1\n```",
          starter: "function score() { return 0; }",
          tests: "test('scores', () => { assert.equal(score(), 1); });",
          solution: "function score() { return 1; }",
        },
      });
      const judgeTopic = await anyTopic.requireAnyTopic(planner, "custom.llm_as_judge");
      assert.equal(
        (await roadmaps.getTopicPanel(planner, "custom.llm_as_judge")).practice,
        "checking",
        "the panel offers Try it in code, where the check runs",
      );
      assert.equal((await call("get_topic", { topicId: "custom.llm_as_judge" })).uncheckedExercise?.labId, saved.labId);
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
      assert.equal(roadmap.goal.title, "Frontend engineer", "the newest roadmap opens");
      assert.equal(roadmap.roadmapId, second.id);
      assert.equal(roadmap.chapters[0].topics[0].status, "in_progress", "a topic keeps its progress across roadmaps");
      const rowsOf = async () =>
        (await db().select().from(labRoadmaps).where(eq(labRoadmaps.userId, planner)))
          .map((row) => `${row.goal}:${row.status}`)
          .sort();
      assert.deepEqual(
        await rowsOf(),
        ["AI engineer:active", "Frontend engineer:active"],
        "a new roadmap is added next to the first (engineering-roadmaps.md)",
      );
      assert.equal((await call("get_roadmap", { roadmapId: first.id })).goal.title, "AI engineer");
      await assert.rejects(call("get_roadmap", { roadmapId: "nope" }), /Unknown roadmap/);
      await assert.rejects(
        tools.callAgentTool(other, "get_roadmap", { roadmapId: first.id }),
        /Unknown roadmap/,
        "roadmaps are per owner",
      );
      let state = await call("get_current_state", {});
      assert.deepEqual(
        state.roadmaps.map((item: { goal: string }) => item.goal),
        ["Frontend engineer", "AI engineer"],
        "every active roadmap, opened last first",
      );
      assert.equal(state.roadmapId, second.id);

      // Re-plan in place: same id, the old version kept as an archived copy.
      const replanned = await call("save_roadmap", {
        roadmapId: first.id,
        goal: "AI engineer v2",
        chapters: [
          { chapterId: "react", topics: ["react.effects"] },
          { title: "Evals in practice", topics: ["custom.llm_as_judge"] },
        ],
      });
      assert.equal(replanned.id, first.id);
      assert.equal(replanned.replanned, true);
      assert.equal((await call("get_roadmap", { roadmapId: first.id })).goal.title, "AI engineer v2");
      const copies = await db().select().from(labRoadmaps).where(eq(labRoadmaps.replacedBy, first.id));
      assert.deepEqual(
        copies.map((row) => [row.goal, row.status]),
        [["AI engineer", "archived"]],
        "the replaced version is archived, not lost",
      );

      // Up to 3 active; archive and restore.
      const third = await call("save_roadmap", {
        goal: "Third",
        chapters: [{ chapterId: "react", topics: ["react.effects"] }],
      });
      await assert.rejects(
        call("save_roadmap", { goal: "Fourth", chapters: [{ chapterId: "react", topics: ["react.effects"] }] }),
        /archive one first/,
      );
      await assert.rejects(
        call("save_roadmap", {
          roadmapId: copies[0].id,
          goal: "x",
          chapters: [{ chapterId: "react", topics: ["react.effects"] }],
        }),
        /No active roadmap/,
        "only an active roadmap can be re-planned",
      );
      await roadmaps.archiveRoadmap(planner, third.id);
      assert.equal((await call("get_roadmap", { roadmapId: third.id })).active, false, "archived roadmaps still read");
      const fourth = await call("save_roadmap", {
        goal: "Fourth",
        chapters: [{ chapterId: "react", topics: ["react.effects"] }],
      });
      await assert.rejects(roadmaps.restoreRoadmap(planner, third.id), /archive one first/);
      await roadmaps.archiveRoadmap(planner, fourth.id);
      assert.equal((await roadmaps.restoreRoadmap(planner, third.id)).status, "active");
      await roadmaps.archiveRoadmap(planner, third.id);
      await roadmaps.markRoadmapOpened(planner, second.id);
      state = await call("get_current_state", {});
      assert.deepEqual(
        state.roadmaps.map((item: { goal: string }) => item.goal),
        ["Frontend engineer", "AI engineer v2"],
      );
      // The Archived list in the switcher, newest first, and the Profile lines (engineering-roadmaps.md, section 1).
      assert.deepEqual(
        (await roadmaps.archivedRoadmaps(planner)).map((item) => [item.goal, item.replacedBy]),
        [
          ["Third", null],
          ["Fourth", null],
          ["AI engineer", first.id],
        ],
      );
      assert.deepEqual(await roadmaps.archivedRoadmaps(other), [], "archived roadmaps are per owner");
      assert.equal((await roadmaps.getRoadmap(planner, third.id)).archivedAt !== null, true);
      assert.deepEqual(
        (await roadmaps.engineeringSummary(planner)).map((line) => [line.roadmapId, line.headline]),
        [
          [second.id, "Frontend engineer"],
          [first.id, "AI engineer v2"],
        ],
        "one Profile line per active roadmap, opened last first",
      );
      assert.deepEqual(
        (await roadmaps.engineeringSummary(other)).map((line) => line.roadmapId),
        [null],
        "before any roadmap, one line for the role's path",
      );
      await assert.rejects(call("get_topic", { topicId: "custom.not_mine" }), /Unknown topic/);
      await assert.rejects(
        tools.callAgentTool(other, "get_topic", { topicId: "custom.llm_as_judge" }),
        /Unknown topic/,
        "Claude's topics are per owner",
      );
      console.log("ok - roadmaps: several at once, up to 3, re-plan in place, archive and restore");

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

      // Steps, Next topic and chapter done (engineering-progressive-flow.md, sections 2 and 3). The active roadmap is
      // "Evals again": the judge topic (In progress, a passing run) and its copy (Not started, no exercise).
      let judgePanel = await roadmaps.getTopicPanel(planner, "custom.llm_as_judge");
      assert.equal(judgePanel.practice, "passed");
      assert.deepEqual(judgePanel.next, { id: "custom.llm_as_judge_2", title: "LLM as judge" });
      assert.equal(judgePanel.chapterDone, null);
      assert.equal((await roadmaps.getTopicPanel(planner, "custom.llm_as_judge_2")).practice, "none");
      assert.equal((await roadmaps.getTopicPanel(planner, "js.closures")).practice, "not_tried", "a repo lab, not run");
      const learnedReport = await call("report_progress", {
        topicId: "custom.llm_as_judge",
        summary: "Explained judges",
        status: "learned",
        evidence: {
          explanation:
            "A judge model scores answers against a rubric, and you calibrate it on cases you graded yourself.",
          note: "Unaided",
        },
      });
      assert.deepEqual(
        learnedReport.roadmaps,
        [
          {
            roadmapId: second.id,
            goal: "Frontend engineer",
            next: { id: "custom.llm_as_judge_2", title: "LLM as judge" },
            chapterDone: null,
          },
          {
            roadmapId: first.id,
            goal: "AI engineer v2",
            next: { id: "react.effects", title: "Effects & dependencies" },
            chapterDone: "Evals in practice",
          },
        ],
        "Next topic and chapter done on each roadmap with the topic",
      );
      const plainReport = await call("report_progress", { topicId: "custom.llm_as_judge_2", summary: "Started" });
      assert.equal("roadmaps" in plainReport, false, "only Learned and Skipped reports carry what's next");
      const skippedReport = await call("report_progress", {
        topicId: "custom.llm_as_judge_2",
        summary: "Already knows it",
        status: "skipped",
      });
      assert.deepEqual(skippedReport.roadmaps, [
        { roadmapId: second.id, goal: "Frontend engineer", next: null, chapterDone: "Evals again" },
      ]);
      judgePanel = await roadmaps.getTopicPanel(planner, "custom.llm_as_judge_2");
      assert.deepEqual(judgePanel.chapterDone, { title: "Evals again", learned: 1, total: 2 });
      assert.equal(judgePanel.next, null);
      console.log("ok - steps: the panel knows the Practice step, Next topic and chapter done, and so does Claude");

      // The summary of a finished roadmap (engineering-progressive-flow.md, section 4): "Evals again" is now done.
      const finished = await roadmaps.getRoadmapSummary(planner, await roadmaps.getRoadmap(planner));
      assert.ok(finished, "every topic is Learned or Skipped");
      assert.deepEqual(finished.counts, { learned: 1, skipped: 1, chapters: 1 });
      assert.deepEqual(
        finished.chapters[0].topics.map((item) => [item.id, item.status, item.words]),
        [
          [
            "custom.llm_as_judge",
            "learned",
            "A judge model scores answers against a rubric, and you calibrate it on cases you graded yourself.",
          ],
          ["custom.llm_as_judge_2", "skipped", null],
        ],
      );
      assert.ok(finished.startedAt && finished.finishedAt && finished.startedAt <= finished.finishedAt);
      assert.equal(
        await roadmaps.getRoadmapSummary(other, await roadmaps.getRoadmap(other)),
        null,
        "an unfinished roadmap has none",
      );
      console.log("ok - summary: a finished roadmap lists each topic with the owner's words");
    } finally {
      await db().delete(users).where(eq(users.id, planner));
    }

    // Review sheets, sessions and Ready to check (engineering-claude-first.md, section 9h).
    const reviewer = `engineering-check-${randomUUID()}`;
    await db()
      .insert(users)
      .values({ id: reviewer, email: `${reviewer}@example.invalid`, name: "Engineering check (review)" });
    try {
      const reviews = await import("../src/features/engineering-lab/review-store");
      const call = (name: string, input: unknown) =>
        tools.callAgentTool(reviewer, name, input) as Promise<Record<string, any>>;
      const topicId = "rel.retry_backoff";
      const { points } = await anyTopic.requireAnyTopic(reviewer, topicId);
      const sheetFor = (mistake: string, count = points.length) => ({
        points: Array.from({ length: count }, (_, index) => ({
          pointId: `p${count - index}`,
          question: `Question ${count - index}?`,
          explanation: "Wait longer after each failure, so a struggling service gets room to recover.",
          example: "const delay = Math.min(base * 2 ** attempt, cap);",
          mistake,
          ownMistake: true,
        })),
        terms: [{ term: "Exponential backoff", meaning: "Doubling the wait after each failed try." }],
      });

      assert.equal((await reviews.getReview(reviewer, topicId)).sheet, null, "no sheet before Claude writes one");
      await assert.rejects(call("save_review", { topicId, sheet: sheetFor("x", points.length - 1) }), /Missing: p/);
      assert.equal((await call("save_review", { topicId, sheet: sheetFor("Retrying with no cap") })).version, 1);
      assert.equal((await call("save_review", { topicId, sheet: sheetFor("Retrying right away") })).version, 2);
      let review = await reviews.getReview(reviewer, topicId);
      assert.equal(review.sheet?.version, 2, "the latest version shows");
      assert.equal(review.sheet?.sheet.points[0].mistake, "Retrying right away");
      assert.deepEqual(
        review.sheet?.sheet.points.map((item) => item.pointId),
        points.map((_, index) => `p${index + 1}`),
        "stored in point order",
      );
      assert.deepEqual(
        review.versions.map((item) => item.version),
        [2, 1],
        "old versions are kept",
      );
      assert.equal(
        (await reviews.getReview(reviewer, topicId, 1)).sheet?.sheet.points[0].mistake,
        "Retrying with no cap",
      );
      await assert.rejects(reviews.getReview(reviewer, topicId, 9), /No version 9/);
      assert.equal((await reviews.getReview(other, topicId)).sheet, null, "sheets are per owner");
      assert.equal((await call("get_topic", { topicId })).review.version, 2, "Claude reads the latest sheet");
      assert.equal(await tools.claudeWritesToday(reviewer), 2, "sheets count toward the daily limit");
      console.log("ok - review: save_review adds a version, the latest shows, old ones stay");

      await call("report_progress", { topicId, summary: "Taught p1 to p3", stuck: "Forgot the cap on the delay" });
      await assert.rejects(
        call("report_progress", { topicId, summary: "Every point taught", status: "ready_to_check" }),
        /Invalid input/,
        "Ready to check is gone",
      );
      await call("report_progress", { topicId, summary: "Every point taught" });
      await db().insert(labTopicEvents).values({
        id: randomUUID(),
        userId: reviewer,
        topicId,
        kind: "report",
        source: "claude",
        status: "ready_to_check",
        summary: "Saved before Ready to check was removed",
      });
      assert.equal(
        (await statuses.topicStatus(reviewer, topicId)).status,
        "in_progress",
        "an old one reads as In progress",
      );
      const reports = await statuses.listReports(reviewer, topicId);
      assert.equal(reports[0].status, "in_progress");
      assert.equal(reports[2].stuck, "Forgot the cap on the delay", "a session keeps where the owner got stuck");
      assert.equal(reports[1].stuck, null);
      console.log(
        "ok - review: sessions say where the owner got stuck, and an old Ready to check reads as In progress",
      );

      await topics.recordExerciseRun(reviewer, topicId, {
        labId: "retry-policy",
        code: "function retryDelay() { return 0; }",
        passed: 0,
        failed: 4,
        output: "",
      });
      assert.equal((await reviews.getReview(reviewer, topicId)).passingCode, null, "a failing run isn't shown");
      await topics.recordExerciseRun(reviewer, topicId, {
        labId: "retry-policy",
        code: "function retryDelay(n) { return Math.min(100 * 2 ** n, 5000); }",
        passed: 4,
        failed: 0,
        output: "",
      });
      const words = "Each retry waits twice as long as the one before, up to a cap, so the service can recover.";
      await call("report_progress", {
        topicId,
        summary: "Fresh check passed",
        status: "learned",
        evidence: { explanation: words, note: "Unaided" },
      });
      review = await reviews.getReview(reviewer, topicId);
      assert.match(review.passingCode?.code ?? "", /Math\.min/);
      assert.equal(review.explanation?.text, words);
      console.log("ok - review: the tab shows the passing code and the owner's own explanation");

      await statuses.addNote(reviewer, topicId, "owner", "Backoff needs jitter too");
      const hits = await reviews.searchAllReviews(reviewer, "BACKOFF");
      assert.deepEqual(
        hits.map((hit) => hit.where),
        ["term", "note"],
      );
      assert.equal(hits[0].title, (await anyTopic.requireAnyTopic(reviewer, topicId)).title);
      assert.deepEqual(await reviews.searchAllReviews(other, "backoff"), [], "search stays within the owner");
      console.log("ok - review: search finds a term across sheets and notes");
    } finally {
      await db().delete(users).where(eq(users.id, reviewer));
    }

    // Claude's topic plans and material (docs/architecture/roadmap-ui.md, "Topic panel: what comes next").
    const writer = `engineering-check-${randomUUID()}`;
    await db()
      .insert(users)
      .values({ id: writer, email: `${writer}@example.invalid`, name: "Engineering check (material)" });
    try {
      const material = await import("../src/features/engineering-lab/topic-material-store");
      const call = (name: string, input: unknown) =>
        tools.callAgentTool(writer, name, input) as Promise<Record<string, any>>;
      const [retry, timeouts, logs] = ["rel.retry_backoff", "rel.timeouts", "obs.logs"];
      const roadmapId = (
        await call("save_roadmap", {
          goal: "Reliable services",
          chapters: [{ title: "Reliability", topics: [retry, timeouts, logs] }],
        })
      ).id as string;

      assert.equal(
        (await call("get_roadmap", { roadmapId })).chapters[0].topics[0].plan,
        null,
        "no plan before Claude saves one",
      );
      await call("save_topic_plan", {
        roadmapId,
        topics: [
          { topicId: timeouts, minutes: 30, difficulty: "easy" },
          { topicId: retry, prerequisites: [timeouts], related: [logs], minutes: 45, difficulty: "medium" },
        ],
      });
      await call("save_topic_plan", { roadmapId, topics: [{ topicId: retry, minutes: 40 }] });
      const plans = await material.getPlans(roadmapId);
      assert.deepEqual(plans[retry], { prerequisites: [timeouts], related: [logs], minutes: 40, difficulty: "medium" });
      assert.equal(
        (await call("get_roadmap", { roadmapId })).chapters[0].topics[0].plan.minutes,
        40,
        "Claude reads its plan back",
      );
      await assert.rejects(
        call("save_topic_plan", { roadmapId, topics: [{ topicId: timeouts, prerequisites: [retry] }] }),
        /Loop: rel\.timeouts → rel\.retry_backoff → rel\.timeouts/,
      );
      await assert.rejects(
        call("save_topic_plan", { roadmapId, topics: [{ topicId: "react.effects", minutes: 20 }] }),
        /isn't on this roadmap/,
      );
      await assert.rejects(material.saveTopicPlans(other, roadmapId, [{ topicId: retry }]), /Unknown roadmap/);
      console.log("ok - material: save_topic_plan saves and corrects a topic's plan, and refuses loops and strangers");

      const panel = await roadmaps.getTopicPanel(writer, retry, roadmapId);
      assert.deepEqual(panel.plan?.waitingOn, [timeouts], "waiting on a prerequisite not yet learned");
      assert.deepEqual(
        panel.plan?.related.map((topic) => topic.id),
        [logs],
      );
      assert.equal(panel.material, null, "Not planned yet");
      console.log("ok - material: the panel shows prerequisites, Waiting on and related topics");

      const input = {
        topicId: retry,
        description: "Wait longer after each failure so a struggling service can recover",
        tasks: {
          read: "Read the retry section with Claude",
          build: "Build a capped backoff",
          explain: "Explain the cap",
        },
        resources: [{ title: "Retries", url: "https://example.com/retries", kind: "docs" as const }],
        criteria: ["Why the wait doubles", "Why there is a cap", "Why jitter helps"],
      };
      await assert.rejects(
        material.saveTopicMaterial(writer, input, async (urls) => urls),
        /These links don't load: https:\/\/example\.com\/retries/,
      );
      assert.equal(await material.getMaterial(writer, retry), null, "nothing is saved when a link is broken");
      await material.saveTopicMaterial(writer, input, async () => []);
      await material.saveTopicMaterial(writer, { ...input, criteria: ["One", "Two", "Three"] }, async () => []);
      const saved = await material.getMaterial(writer, retry);
      assert.equal(saved?.description, input.description);
      assert.deepEqual(saved?.criteria, ["One", "Two", "Three"], "saving again replaces it whole");
      assert.equal(await material.getMaterial(other, retry), null, "material is per owner");
      assert.equal((await call("get_topic", { topicId: retry })).material.tasks.build, "Build a capped backoff");
      assert.ok((await tools.claudeWritesToday(writer)) >= 2, "material and plans count toward the daily limit");
      console.log("ok - material: save_topic_material replaces a topic's material, and refuses broken links");

      // Retire as replaced: Claude's criteria are now the topic's points everywhere, and its description the line.
      const replaced = await anyTopic.requireAnyTopic(writer, retry);
      assert.deepEqual(replaced.points, ["One", "Two", "Three"]);
      assert.equal(replaced.gap, input.description);
      assert.notDeepEqual(
        (await anyTopic.requireAnyTopic(other, retry)).points,
        replaced.points,
        "another owner keeps the topic map's points",
      );
      const topicView = await call("get_topic", { topicId: retry });
      assert.deepEqual(
        topicView.points.map((point: { id: string }) => point.id),
        ["p1", "p2", "p3"],
        "Claude checks against its own criteria",
      );
      const sheetOf = (count: number) => ({
        points: Array.from({ length: count }, (_, index) => ({
          pointId: `p${index + 1}`,
          question: "Why?",
          explanation: "Because the wait grows after each failure.",
          example: "const delay = Math.min(base * 2 ** attempt, cap);",
          mistake: "Retrying right away",
          ownMistake: false,
        })),
        terms: [{ term: "Backoff", meaning: "Waiting longer after each failed try." }],
      });
      await assert.rejects(call("save_review", { topicId: retry, sheet: sheetOf(5) }), /p4|p5|points/i);
      assert.equal((await call("save_review", { topicId: retry, sheet: sheetOf(3) })).version, 1);
      const panelAfter = await roadmaps.getTopicPanel(writer, retry, roadmapId);
      assert.deepEqual(panelAfter.points, ["One", "Two", "Three"], "the panel shows the same criteria");
      console.log(
        "ok - material: Claude's criteria replace the topic's points for get_topic, review sheets and the panel",
      );

      // Delete: the roadmap, the version Re-plan kept and its plans go; the topic's material stays.
      await call("save_roadmap", {
        roadmapId,
        goal: "Reliable services v2",
        chapters: [{ title: "Reliability", topics: [retry] }],
      });
      await assert.rejects(roadmaps.deleteRoadmap(other, roadmapId), /Unknown roadmap/, "only the owner deletes");
      assert.deepEqual(await roadmaps.deleteRoadmap(writer, roadmapId), { id: roadmapId, deleted: true });
      assert.deepEqual(await db().select().from(labRoadmaps).where(eq(labRoadmaps.userId, writer)), []);
      assert.deepEqual(await material.getPlans(roadmapId), {}, "its plans go with it");
      assert.notEqual(await material.getMaterial(writer, retry), null, "the topic's material stays");
      await assert.rejects(roadmaps.deleteRoadmap(writer, roadmapId), /Unknown roadmap/);
      console.log("ok - roadmaps: delete removes a roadmap with its replaced versions and plans");
    } finally {
      await db().delete(users).where(eq(users.id, writer));
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
