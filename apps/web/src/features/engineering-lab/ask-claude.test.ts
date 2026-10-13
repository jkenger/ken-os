import assert from "node:assert/strict";
import { test } from "node:test";
import { askClaudeMessage, claudeLink, claudeProjectUrl } from "./ask-claude";

// Ask Claude (docs/architecture/engineering-claude-connector.md, section 6).

test("the starter message names the topic and its id", () => {
  assert.equal(
    askClaudeMessage({ id: "js.closures", title: "Closures" }),
    "Teach me Closures (Ken OS topic `js.closures`). Start by checking where I am.",
  );
});

test("only an https claude.ai link shows the button", () => {
  assert.equal(claudeProjectUrl(undefined), null, "unset hides it");
  assert.equal(claudeProjectUrl("  "), null);
  assert.equal(claudeProjectUrl("https://claude.ai/project/0198"), "https://claude.ai/project/0198");
  assert.equal(claudeProjectUrl(" https://claude.ai/project/0198 "), "https://claude.ai/project/0198");
  for (const bad of [
    "http://claude.ai/project/1",
    "https://claude.ai.evil.example/p",
    "https://evil.example/p",
    "javascript:alert(1)",
    "not a url",
  ]) {
    assert.equal(claudeProjectUrl(bad), null, bad);
  }
});

test("Project and chat links are https claude.ai links only", () => {
  assert.equal(claudeLink("https://claude.ai/chat/0198-abcd"), "https://claude.ai/chat/0198-abcd");
  assert.equal(claudeLink("https://claude.ai/code/project/chan_1"), "https://claude.ai/code/project/chan_1");
  for (const bad of [
    null,
    "",
    "claude.ai/chat/1",
    "https://claude.ai.evil.example/chat/1",
    "https://user@claude.ai/chat/1",
  ]) {
    assert.equal(claudeLink(bad), null, String(bad));
  }
});
