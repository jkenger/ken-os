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

test("a user turn with array content (not a plain string) still has its text extracted", () => {
  const history: AgentInputItem[] = [{ role: "user", content: [{ type: "input_text", text: "from an array" }] }];
  assert.deepEqual(toDisplayMessages(history), [{ role: "user", content: "from an array" }]);
});

test("an empty user turn is skipped too, not just an empty assistant one", () => {
  const history: AgentInputItem[] = [{ role: "user", content: "" }];
  assert.deepEqual(toDisplayMessages(history), []);
});

test("a part with no text (a refusal, not output_text) is dropped from the joined reply", () => {
  const history: AgentInputItem[] = [
    {
      role: "assistant",
      status: "completed",
      content: [
        { type: "refusal", refusal: "can't help with that" },
        { type: "output_text", text: "but here's this" },
      ],
    },
  ];
  assert.deepEqual(toDisplayMessages(history), [{ role: "assistant", content: "but here's this" }]);
});

test("a role other than user/assistant is skipped even when its content looks like a real reply", () => {
  // Not a real system item's shape (those only ever carry a plain string) -- array content here proves the
  // role check itself gates this, not an accident of what system items happen to contain.
  const history = [
    { role: "system", content: [{ type: "output_text", text: "leaked" }] },
  ] as unknown as AgentInputItem[];
  assert.deepEqual(toDisplayMessages(history), []);
});

test("a null entry among the content parts is dropped, not read for .text and crashed on", () => {
  const history = [
    { role: "assistant", status: "completed", content: [null, { type: "output_text", text: "still here" }] },
  ] as unknown as AgentInputItem[];
  assert.deepEqual(toDisplayMessages(history), [{ role: "assistant", content: "still here" }]);
});

test("a bare primitive among the content parts is dropped without the 'text' check throwing on it", () => {
  const history = [
    { role: "assistant", status: "completed", content: ["oops", { type: "output_text", text: "still here" }] },
  ] as unknown as AgentInputItem[];
  assert.deepEqual(toDisplayMessages(history), [{ role: "assistant", content: "still here" }]);
});

test("an item with no role at all (a future tool call) is skipped without crashing", () => {
  const history: AgentInputItem[] = [{ type: "function_call", name: "noop", callId: "1", arguments: "{}" } as never];
  assert.deepEqual(toDisplayMessages(history), []);
});
