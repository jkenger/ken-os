import assert from "node:assert/strict";
import { test } from "node:test";
import { agentTools } from "./agent-tools";
import { CLAUDE_INSTRUCTIONS_UPDATED, CLAUDE_PROJECT_INSTRUCTIONS } from "./claude-instructions";

// The Claude Project instructions shown in Claude setup (docs/architecture/engineering-claude-first.md, section 9f).

test("the instructions only name tools that exist, and name the ones the flow relies on", () => {
  const names = new Set<string>(agentTools.map((tool) => tool.name));
  const mentioned = CLAUDE_PROJECT_INSTRUCTIONS.match(/\b(?:get|save|report|list)_[a-z_]+/g) ?? [];
  for (const name of mentioned) assert.ok(names.has(name), `${name} isn't a Ken OS tool`);
  for (const needed of [
    "get_current_state",
    "get_topic",
    "get_history",
    "report_progress",
    "save_note",
    "save_roadmap",
    "save_review",
    "ready_to_check",
  ]) {
    assert.ok(CLAUDE_PROJECT_INSTRUCTIONS.includes(needed), `the instructions should mention ${needed}`);
  }
});

test("the instructions are plain text with a date", () => {
  assert.ok(!CLAUDE_PROJECT_INSTRUCTIONS.includes("—"), "no em dashes");
  assert.match(CLAUDE_INSTRUCTIONS_UPDATED, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(CLAUDE_PROJECT_INSTRUCTIONS.length < 4_000, "short enough to paste");
});
