import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { agentTools, callAgentTool, toolInputs } from "./agent-tools";

// The connector's tool layer (docs/architecture/engineering-claude-first.md, section 5). Database behaviour is in
// scripts/verify-engineering.ts and scripts/verify-connector.ts; these check the rules that need no database.

test("the tools are five reads and four writes", () => {
  assert.deepEqual(
    agentTools.filter((tool) => tool.kind === "read").map((tool) => tool.name),
    ["get_current_state", "get_roadmap", "get_topic", "get_my_work", "get_history"],
  );
  assert.deepEqual(
    agentTools.filter((tool) => tool.kind === "write").map((tool) => tool.name),
    ["save_exercise", "report_progress", "save_roadmap", "save_note"],
  );
});

test("no tool records a run, opens a solution, or changes the role or the profile", () => {
  for (const tool of agentTools)
    assert.doesNotMatch(tool.name, /grade|submit|proof|run|solution|role|profile|delete|edit/, tool.name);
  const source = readFileSync(new URL("./agent-tools.ts", import.meta.url), "utf8");
  for (const forbidden of [
    "recordExerciseRun",
    "recordEvent",
    "openSolution",
    "setStatus",
    "editNote",
    "deleteNote",
    "saveDirection",
    "upsertProfile",
    "labSolutions",
  ]) {
    assert.ok(!source.includes(forbidden), `agent-tools.ts must not use ${forbidden}`);
  }
  assert.ok(!/from "(next|@modelcontextprotocol)/.test(source), "the tool layer never imports route or MCP code");
});

test("inputs are checked before anything runs", async () => {
  await assert.rejects(callAgentTool("nobody", "save_lesson", {}), /Unknown tool/, "lessons left Ken OS");
  await assert.rejects(callAgentTool("nobody", "save_proof_question", {}), /Unknown tool/, "so did graded proofs");
  await assert.rejects(callAgentTool("nobody", "get_topic", {}), /Invalid input. topicId/);
  const report = { topicId: "react.effects", summary: "Explained cleanup" };
  assert.equal(toolInputs.report_progress.safeParse(report).success, true);
  assert.equal(
    toolInputs.report_progress.safeParse({ ...report, status: "not_started" }).success,
    false,
    "only the owner resets a topic",
  );
  assert.equal(
    toolInputs.report_progress.safeParse({ ...report, status: "learned", evidence: { explanation: "x" } }).success,
    false,
    "evidence needs Claude's note",
  );
  assert.equal(
    toolInputs.save_roadmap.safeParse({ goal: "AI engineer", chapters: [] }).success,
    false,
    "a roadmap has chapters",
  );
  assert.equal(
    toolInputs.save_roadmap.safeParse({
      goal: "AI engineer",
      chapters: [{ title: "Evals", topics: [{ title: "Judges", explain: ["One"] }] }],
    }).success,
    false,
    "a new topic needs 3 to 5 lines",
  );
  assert.equal(
    toolInputs.save_roadmap.safeParse({
      goal: "AI engineer",
      chapters: [{ chapterId: "react", topics: ["react.effects"] }],
    }).success,
    true,
  );
  assert.equal(toolInputs.save_note.safeParse({ topicId: "react.effects", body: "" }).success, false);
  assert.equal(toolInputs.save_note.safeParse({ topicId: "react.effects", body: "x".repeat(2_001) }).success, false);
  assert.equal(
    toolInputs.save_note.safeParse({ topicId: "react.effects", body: "Say keeps in sync", author: "owner" }).success,
    false,
    "Claude can't write as the owner",
  );
});

test("a saved exercise must show an example call and its result", () => {
  const exercise = {
    runner: "browser",
    task: "Return the sum of the prices.",
    starter: "function total(prices) { return 0; }",
    tests: "test('sums', () => assert.equal(total([2, 3]), 5));",
    solution: "function total(prices) { return prices.reduce((a, b) => a + b, 0); }",
  };
  const parse = (task: string) =>
    toolInputs.save_exercise.safeParse({ topicId: "react.effects", exercise: { ...exercise, task } });
  const refused = parse(exercise.task);
  assert.equal(refused.success, false);
  assert.match(JSON.stringify(refused.error?.issues), /example/);
  assert.equal(parse(`${exercise.task}\n\n\`\`\`js\ntotal([2, 3]);\n// → 5\n\`\`\``).success, true);
});
