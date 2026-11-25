import assert from "node:assert/strict";
import { test } from "node:test";
import { toDisplayMessages } from "./store";
import type { AgentInputItem } from "@ken-os/agents";

test("a plain-string user turn and a text-part assistant reply both show up, in order", () => {
  const history: AgentInputItem[] = [
    { role: "user", content: "hello" },
    { role: "assistant", status: "completed", content: [{ type: "output_text", text: "hi there" }] },
  ];
  assert.deepEqual(toDisplayMessages(history), [
    { role: "user", content: "hello" },
    { role: "assistant", content: "hi there" },
  ]);
});

test("an assistant reply split across multiple text parts is joined into one message", () => {
  const history: AgentInputItem[] = [
    {
      role: "assistant",
      status: "completed",
      content: [
        { type: "output_text", text: "part one " },
        { type: "output_text", text: "part two" },
      ],
    },
  ];
  assert.deepEqual(toDisplayMessages(history), [{ role: "assistant", content: "part one part two" }]);
});

test("an empty assistant turn (no text parts) is skipped, not shown as a blank message", () => {
  const history: AgentInputItem[] = [{ role: "assistant", status: "completed", content: [] }];
  assert.deepEqual(toDisplayMessages(history), []);
});
