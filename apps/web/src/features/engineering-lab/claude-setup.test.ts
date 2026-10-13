import assert from "node:assert/strict";
import { test } from "node:test";
import { CLAUDE_INSTRUCTIONS_UPDATED, CLAUDE_PROJECT_INSTRUCTIONS } from "./claude-instructions";
import { instructionsState, instructionsVersion, setupAlert, setupChecklist } from "./claude-setup";

// The setup checklist (docs/architecture/engineering-progressive-flow.md, section 1).

const done = { connected: true, instructions: "pasted", projectLinked: true, planned: true } as const;

test("the instructions are Pasted, Out of date or Not yet, by the version Claude last reported", () => {
  assert.equal(instructionsState(null, "2026-10-20"), "not_yet");
  assert.equal(instructionsState("2026-10-20", "2026-10-20"), "pasted");
  assert.equal(instructionsState("2026-10-13", "2026-10-20"), "out_of_date");
  assert.equal(instructionsState("2026-10-21", "2026-10-20"), "pasted", "a newer paste than this build still counts");
});

test("only a YYYY-MM-DD version from Claude is kept", () => {
  assert.equal(instructionsVersion("2026-10-13"), "2026-10-13");
  assert.equal(instructionsVersion(" 2026-10-13 "), "2026-10-13");
  for (const bad of [undefined, "", "latest", "2026-10-13; drop table", "13 Oct 2026", "2026-13-45x"]) {
    assert.equal(instructionsVersion(bad), null, String(bad));
  }
});

test("the instructions tell Claude to report the current version", () => {
  assert.ok(CLAUDE_PROJECT_INSTRUCTIONS.includes(`instructionsVersion "${CLAUDE_INSTRUCTIONS_UPDATED}"`));
});

test("the checklist lists four items in order and counts the done ones", () => {
  const list = setupChecklist({ connected: true, instructions: "not_yet", projectLinked: false, planned: false });
  assert.deepEqual(
    list.items.map((item) => [item.id, item.done]),
    [
      ["connect", true],
      ["instructions", false],
      ["project", false],
      ["plan", false],
    ],
  );
  assert.equal(list.done, 1);
  assert.equal(list.show, true);
});

test("out-of-date instructions don't count as done", () => {
  const list = setupChecklist({ ...done, instructions: "out_of_date" });
  assert.equal(list.items.find((item) => item.id === "instructions")?.done, false);
});

test("the checklist hides once setup is done, and doesn't come back for later problems", () => {
  assert.equal(setupChecklist(done).show, false);
  // Disconnecting or new instructions after setup show on the Claude setup button instead.
  assert.equal(setupChecklist({ ...done, connected: false }).show, false);
  assert.equal(setupChecklist({ ...done, instructions: "out_of_date" }).show, false);
  // Never pasted, or no roadmap yet: still setting up.
  assert.equal(setupChecklist({ ...done, instructions: "not_yet" }).show, true);
  assert.equal(setupChecklist({ ...done, planned: false }).show, true);
  assert.equal(setupChecklist({ ...done, projectLinked: false }).show, true);
});

test("the Claude setup button flags a lost connection first, then stale instructions", () => {
  assert.equal(setupAlert(done), null);
  assert.equal(setupAlert({ ...done, instructions: "out_of_date" }), "Update");
  assert.equal(setupAlert({ ...done, connected: false }), "Not connected");
  assert.equal(setupAlert({ ...done, connected: false, instructions: "out_of_date" }), "Not connected");
  assert.equal(setupAlert({ ...done, instructions: "not_yet" }), null, "the checklist covers first-time setup");
});
