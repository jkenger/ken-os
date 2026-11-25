# Plan: Loona agent — Slice 1 (add a contact via chat)

**Branch**: one branch per implementation slice below (`feat/agents-loona-chat-shell`, `feat/agents-trigger-dev-setup`,
`feat/agents-loona-create-contact`), each its own trunk-based PR.
**Status**: Draft — awaiting acceptance-criteria confirmation before any code is written.

## Goal

Owner can type a complete instruction in a new Agents → Loona chat, have the agent add a contact for real
(name, email, phone, payout destination), and see the outcome — success or failure — in both the chat thread
and a status/activity log.

This is story-splitting's recommended first slice (`docs/product/loona-agent.md`, "Delivery slices"), chosen
because it's the narrowest domain action that still forces every new architectural piece into existence:
Agents nav, chat UI, synchronous LLM tool-calling (new to this codebase), a trigger.dev-backed write (new
dependency), and dual chat+status result display.

Deferred explicitly, not in scope here: multi-turn follow-up questions when info is missing (this slice
assumes one complete message), any loan/payment concept, more than one agent in the Agents section.

## Acceptance Criteria

- [ ] `/agents` shows a top-level section with Loona listed as the only entry.
- [ ] `/agents/loona` shows a chat input and message history.
- [ ] Typing a complete instruction ("add a contact: Jane, jane@x.com, 09171234567, GCash 09171234567")
      gets an immediate reply ("Got it, adding now") in the same request.
- [ ] A later message appears in that same conversation once the write actually finishes — "Contact added"
      on success, or the real failure reason on failure (e.g. duplicate phone).
- [ ] The same event (success or failure) also appears in a status/activity log, independent of the chat.
- [ ] The actual database write happens inside a trigger.dev task, not inline in the chat request.

## Slices

Three implementation slices for this one story. Slices 1 and 3 are behavior changes (RED-GREEN-REFACTOR).
Slice 2 is a horizontal exception: introducing trigger.dev as a dependency, justified because it names the
vertical slice it unlocks (Slice 3), stays deployable on its own, and has its own observable verification.

trigger.dev itself was already owner-selected before this plan (named explicitly at the start of this
feature's scoping, not an open build-vs-adopt question) — the `evaluate-existing-solutions` preflight is
skipped for that reason; Slice 2 only covers wiring it in correctly.

### Slice 1: Owner can chat with Loona and get a real reply

**Value**: Proves the nav + chat UI + synchronous LLM call path end to end, with no tool-calling yet — a
thin, structurally-uncomposed walking skeleton. Observable and gives real feedback (does the agent reply
sensibly, is latency acceptable) even though it can't act on anything yet.
**Path**: `/agents` (new route, lists Loona) → `/agents/loona` (chat UI: input + message list) → a Server
Action (`sendLoonaMessage`) calls the Anthropic SDK (already a dependency via `packages/agents`) with the
conversation history → reply is persisted and rendered.
**Class**: Behavior change.
**Delivery**: Independent PR, branch `feat/agents-loona-chat-shell`.
**Required implementation skills**: `tdd`, `testing`. `refactoring` if the Server Action grows messy.
**Acceptance criteria**:

- Visiting `/agents` shows "Loona" as the only entry; clicking it opens `/agents/loona`.
- Typing a message and submitting shows the user's message, then the assistant's reply, in order.
- Conversation persists across a page reload (new `agentConversations` / `agentMessages` tables in
  `apps/web/src/lib/db/schema.ts`).
- **Present to the human and get confirmation before writing any code.**
  **RED**: A test that posts one message to the chat Server Action/route and asserts a persisted assistant
  reply exists afterward, and that a second load of the conversation returns both messages in order.
  **GREEN**: Minimal nav route, chat page, schema, and Server Action to make that pass — no tools, no
  trigger.dev.
  **REFACTOR**: Only if the Server Action/LLM-call wrapper is already duplicating something in
  `packages/agents`.
  **PRE-PR MUTATION**: Run `mutation-testing` once, focused on the new Server Action and persistence, when
  this slice is otherwise PR-ready.
  **PR-ready when**: Acceptance criteria above pass, mutation gate run, typecheck/lint pass, human approves.
  **Slice complete when**: This PR lands.

### Slice 2: Introduce trigger.dev as the job runner

**Value**: Horizontal exception. Unlocks Slice 3 (the real contact-creation write must run as a trigger.dev
task, per the already-agreed infra split: chat is sync, trigger.dev owns mutating writes). Leaves the app
deployable with nothing user-facing changed yet.
**Path**: Add `@trigger.dev/sdk` to `apps/web`, a `trigger.config.ts`, required env vars
(`TRIGGER_SECRET_KEY`, project ref) in `.env.example`, and one trivial verifiable task (e.g. a no-op
`healthcheck` task) triggered from a throwaway test/script — not from any real UI path yet.
**Class**: Horizontal exception (dependency introduction).
**Delivery**: Independent PR, branch `feat/agents-trigger-dev-setup`.
**Required implementation skills**: `N/A` for TDD (no product behavior changes); verify via trigger.dev's
own dev-run tooling.
**Acceptance criteria**:

- `pnpm --filter @ken-os/web exec trigger dev` runs locally against the new config.
- The `healthcheck` task can be triggered and observed completing (trigger.dev dashboard/CLI output, or a
  small script asserting the run's final status is `COMPLETED`).
- No existing route or page changes behavior.
- **Present to the human and get confirmation before writing any code.**
  **RED/GREEN**: `N/A` — infra wiring, not a behavior change. Verification is the task-run observation above.
  **PRE-PR evidence**: `N/A` mutation (no new logic to mutate); alternate evidence is the task-run proof above.
  **PR-ready when**: The task runs and completes observably, nothing else changed, human approves.
  **Slice complete when**: This PR lands.

### Slice 3: Owner can add a contact via chat, written through trigger.dev, result in both places

**Value**: The real payoff — the first actual write this agent can make, proving the fire-and-forget
pattern and the dual chat+status result display end to end, including failure.
**Path**: Chat message → LLM tool call `create_contact` (one tool, following the `toolRegistry` shape used
as reference in current Loona's `src/server/luna/tools/index.ts`) → chat replies immediately ("Got it,
adding now") → the Server Action triggers the `create_contact` trigger.dev task with the parsed fields →
task writes to a new `loonaContacts` table → on completion, the task calls back into the app (an internal
API route, e.g. `/api/agents/loona/contacts/[runId]/complete`) which appends the real outcome as a new
assistant message to the conversation AND writes a row to a new, agent-agnostic `agentActivityLog` table
(`agentKey`, `summary`, `status: success | failure`, `createdAt`) → the chat UI polls the conversation for
new messages while a run is pending, and the `/agents/loona` status view reads `agentActivityLog` directly.
**Class**: Behavior change.
**Delivery**: Independent PR, branch `feat/agents-loona-create-contact`. Depends on Slice 2 landing first
(needs a real trigger.dev task to call).
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria** (from `docs/product/loona-agent.md`'s acceptance examples):

- "Add Jane, jane@x.com, 09171234567, GCash 09171234567" → chat shows "Got it, adding now" immediately,
  then "Contact added" once the trigger.dev task completes; `agentActivityLog` gets a matching success row.
- Submitting a duplicate phone number → chat shows the real failure reason once the task completes;
  `agentActivityLog` gets a matching failure row.
- The contact row only exists after the trigger.dev task runs, never written inline in the chat request.
- **Present to the human and get confirmation before writing any code.**
  **RED**: A test that sends a complete "add a contact" message, asserts the immediate reply is the
  acknowledgment (not the final result), then — after the triggered task is awaited/completed in the test
  harness — asserts both the follow-up chat message and the `agentActivityLog` row exist with the correct
  outcome. A second test covers the duplicate-phone failure path the same way.
  **GREEN**: Minimal `create_contact` tool, `loonaContacts` schema, trigger.dev task, completion callback
  route, and the chat UI's poll-while-pending behavior.
  **REFACTOR**: Extract the tool-registry/context-card shapes only if a second tool is imminent; don't
  pre-build a generic registry for a single tool.
  **PRE-PR MUTATION**: Run `mutation-testing` once for this slice's accumulated scope (tool parsing, task
  write, completion callback, failure path) when otherwise PR-ready. Address valuable survivors.
  **PR-ready when**: All acceptance criteria above pass, mutation gate run and survivors addressed,
  typecheck/lint pass, human approves.
  **Slice complete when**: This PR lands.

## Pre-PR Quality Gate

Applies to Slices 1 and 3 (Slice 2 has no product behavior to gate beyond its own task-run check):

1. Implementation complete, ordinary verification done
2. Mutation run once per slice at PR-readiness; survivors addressed
3. Typecheck and lint pass (`pnpm check`)
4. Full test suite (`pnpm test`), plus the relevant `pnpm --filter @ken-os/web test:db:*` if a new DB table
   needs its own check added to that family
5. Evidence stays current after any later fixes, per this repo's existing mutation-evidence practice

---

_Next.js on this repo is pinned to `latest` and differs from training data — read `node_modules/next/dist/docs/`
for route/Server Action conventions before writing Slice 1's code._
