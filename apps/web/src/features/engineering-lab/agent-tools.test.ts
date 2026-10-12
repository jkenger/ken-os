import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { agentTools, callAgentTool, toolInputs } from "./agent-tools";

// The connector's tool layer (docs/architecture/engineering-claude-connector.md, section 3). Database behaviour is in
// scripts/verify-engineering.ts; these check the rules that need no database.

test("the tools are exactly the spec's five reads and three content writes", () => {
  assert.deepEqual(agentTools.filter((tool) => tool.kind === "read").map((tool) => tool.name), ["get_current_state", "get_topic", "get_my_work", "get_history", "list_path"]);
  assert.deepEqual(agentTools.filter((tool) => tool.kind === "write").map((tool) => tool.name), ["save_lesson", "save_exercise", "save_proof_question"]);
});

test("no tool can grade, prove, record a run or change Practice, the path or the profile", () => {
  for (const tool of agentTools) assert.doesNotMatch(tool.name, /grade|submit|prove|proven|run|review|practice|path_|role|profile|solution/, tool.name);
  const source = readFileSync(new URL("./agent-tools.ts", import.meta.url), "utf8");
  for (const forbidden of ["submitProof", "recordExerciseRun", "recordEvent", "openSolution", "answerPractice", "saveDirection", "upsertProfile", "gradeWithRubric", "labSolutions"]) {
    assert.ok(!source.includes(forbidden), `agent-tools.ts must not use ${forbidden}`);
  }
  assert.ok(!/from "(next|@modelcontextprotocol)/.test(source), "the tool layer never imports route or MCP code");
});

test("only the state and path tools answer during an open assessment", () => {
  assert.deepEqual(agentTools.filter((tool) => tool.openDuringAssessment).map((tool) => tool.name), ["get_current_state", "list_path"]);
});

test("inputs are checked before anything runs", async () => {
  await assert.rejects(callAgentTool("nobody", "grade_proof", {}), /Unknown tool/);
  await assert.rejects(callAgentTool("nobody", "get_topic", {}), /Invalid input. topicId/);
  await assert.rejects(callAgentTool("nobody", "get_topic", { topicId: "js.call_stack", extra: true }), /Invalid input/);
  const exercise = { runner: "browser", task: "Retry three times", starter: "", tests: "test('a', () => {})", solution: "x" };
  assert.equal(toolInputs.save_exercise.safeParse({ topicId: "rel.retry_backoff", exercise }).success, true);
  assert.equal(toolInputs.save_exercise.safeParse({ topicId: "rel.retry_backoff", exercise: { ...exercise, runner: "probe" } }).success, false, "probes are built in");
  assert.equal(toolInputs.save_exercise.safeParse({ topicId: "rel.retry_backoff", exercise: { ...exercise, solution: "x".repeat(20_001) } }).success, false, "20,000 characters per file");
  assert.equal(toolInputs.save_proof_question.safeParse({ topicId: "rel.retry_backoff", prompt: "Why jitter?", pointIds: [] }).success, false, "a question names its points");
  assert.equal(toolInputs.save_proof_question.safeParse({ topicId: "rel.retry_backoff", prompt: "x".repeat(1_001), pointIds: ["p1"] }).success, false, "1,000 characters");
  assert.equal(toolInputs.save_proof_question.safeParse({ topicId: "rel.retry_backoff", prompt: "Why jitter?", pointIds: ["p1"], rubric: ["mine"] }).success, false, "the rubric is never Claude's");
});
