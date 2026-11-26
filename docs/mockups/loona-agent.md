# Loona agent: mockup brief

Status: proposed, 26 Nov 2026. Draws the new states Slice 3 (`docs/architecture/loona-agent.md`) adds on top of
Slice 1's shipped chat screen: the chat's pending-then-resolved message pair for a contact-creation request, and
a new activity log view that shows the same outcome independent of the chat (`docs/product/loona-agent.md`).
This brief says which frames, states and words to draw. Code follows the chosen mockups.

## Handoff: what to return

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in
   Ground rules, plus the dark frame named. Do not export or render PNGs unless the owner asks.
2. **`loona-agent-canvas/README.md`** in project files, with:
   - **Frames**: a table of every frame id and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here,
     and why.
   - **Proposals**: any new token or component the frames needed.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back.

Do not change code, `globals.css` or this brief. Changes go under "Changes from this brief"; the owner folds the
agreed ones in.

## Ground rules

- Loots as it is: shadcn's default setup plus the Loots tokens in `design-system.md`. Chat frames build from
  the primitives Slice 1 already shipped (`components/ui/conversation.tsx`, `components/ui/message.tsx`,
  `Textarea`, `Button`) — don't redesign the chat shell itself, only the two new message states it needs.
- Activity log reuses the shape `design-system.md` already establishes (`StatusIcon`/`StatusLabel`/`StatusChip`,
  `components/engineering/roadmap/status.tsx`, also reused by the Jobs scraper status panel,
  `features/jobs/overview.tsx`): icon plus word, soft chip, not a new visual language — but its own two states
  (success, failure), not a mapping onto topic states.
- State colors: success is green (`docs/architecture/design-system.md`'s learned/success token), failure is the
  destructive red already used for errors elsewhere. Never color alone — pair with the word or icon shape.
- Words: app language on the chrome (titles, nav, the activity log's own labels) — a noun or short phrase, no
  sentences. Loona's own chat replies are content, not chrome, so they stay full sentences, following the
  existing instructions in `packages/agents/src/loona/chat.ts` ("Plain words, no filler, no em dashes").
- Sizes: desktop at 1440, phone at 390. Light theme, plus one dark frame.
- Real data: use the real acceptance examples from `docs/product/loona-agent.md` for every frame's content —
  "Jane, jane@x.com, 09171234567, GCash 09171234567" for the success path, a duplicate-phone failure for the
  failure path. Don't invent placeholder names.

## Current screens, for reference

- `/agents` (`features/agents/agents-list-page.tsx`): a single `Bot`-icon card linking to Loona. Untouched here.
- `/agents/loona` (`features/loona/loona-chat-page.tsx`): message history in a `Conversation`/`ConversationContent`
  scroll area, each turn a `Message`/`MessageContent` bubble (user right-aligned on `bg-accent`, assistant on the
  `panel` surface), a `Textarea` + `Button` composer below. No activity view exists yet — Slice 3 adds one.

## Frames

| Frame | State                                                                                                                                                                                                                                           | Copy                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| L1    | Chat: owner has just sent the request, Loona's immediate reply has landed, the background run is pending                                                                                                                                        | User: "Add Jane, jane@x.com, 09171234567, GCash 09171234567" / Loona: "Got it, adding now"           |
| L2    | Same thread, pending bubble shown with its loading affordance (see Behaviour below)                                                                                                                                                             | Same                                                                                                 |
| L3    | Same thread, the run has completed: a third message appended with the real outcome                                                                                                                                                              | Loona: "Contact added"                                                                               |
| L4    | Failure variant of L3: a duplicate phone number was submitted                                                                                                                                                                                   | Loona: the real failure reason, e.g. "Couldn't add Jane — 09171234567 is already a contact's number" |
| L5    | **New**: activity log view, empty state (no agent has logged anything yet)                                                                                                                                                                      | "Nothing yet" / one line on what gets logged here                                                    |
| L6    | Activity log with a mix of rows: at least two success and one failure, newest first                                                                                                                                                             | Each row: outcome chip, summary text, relative timestamp                                             |
| L7    | Activity log's two row types in isolation, large, to compare the success/failure chip treatment                                                                                                                                                 | Same two summaries as L3/L4                                                                          |
| L8    | **Open layout question**: where the activity log sits relative to chat on `/agents/loona` — draw your recommended default (a two-tab switcher, Chat/Activity, is this brief's starting guess) plus the full page so both are visible in context | —                                                                                                    |
| L9    | Phone width (390) of L1 and L6                                                                                                                                                                                                                  | Same                                                                                                 |
| L10   | Dark frame of L3 and L6                                                                                                                                                                                                                         | Same                                                                                                 |

## Behaviour to show or annotate

- **Pending vs. final messages must read differently.** The chat polls for new messages while a run is pending
  (`docs/architecture/loona-agent.md`) — the owner needs a visual cue that "Got it, adding now" isn't the final
  word. Propose a treatment (a subtle pulsing dot per `DESIGN.md`'s status-dot motion, a muted/italic tone, a
  small inline spinner) rather than leaving it indistinguishable from L3/L4's resolved messages.
- The activity log is agent-agnostic (`agentActivityLog` has no Loona-specific shape) but only Loona exists
  today — don't design a per-agent filter or a cross-agent feed; draw it as Loona's own log for now.
- Failure summaries show the real reason the write failed, never a generic "Something went wrong."
- Activity rows are read-only: no action, no dismiss, no delete.

## Open questions

- **L8, where the activity log lives**: a tab switcher on `/agents/loona` is this brief's default guess because
  there's only one agent and `agents-list-page.tsx`'s own comment says Loona stays "deliberately concrete-first"
  — but confirm whether a separate route, a side panel, or something else reads better once drawn.
- Exact wording for the pending acknowledgment ("Got it, adding now" vs. shorter/different) and the duplicate-
  phone failure reason — propose options against the real copy voice rules (plain, no em dashes).
- Whether the activity log needs pagination/a visible row limit once it could hold many entries, or whether
  that's a later concern once real volume exists.

## Explicitly out of scope

Any loan or payment concept. A second agent, or any cross-agent activity feed. Editing or deleting a logged
contact or activity row. The `/agents` list page and the chat shell's own layout — both ship as Slice 1 built
them.
