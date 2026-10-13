# Engineering, Claude first

Status: approved by the owner, 13 Oct 2026, after a design review in chat. All four slices built on 13 Oct 2026 (§9a to §9d). This is the source of truth for the Engineering module from now on. `engineering-rebuild.md` and `engineering-claude-connector.md` are history; where they disagree with this file, this file wins.

## Decision

**Claude teaches. Ken OS shows where you are.**

After the connector shipped, the owner learned Effects & dependencies entirely in their Claude Project and preferred it to the in-app flow. Claude checked their state, asked before telling, sent them to the exercise, read their code and asked for the explanation. So all learning moves to Claude. Ken OS keeps the roadmap, each topic's state, Claude's reports and the owner's notes, on one screen.

This reverses the connector spec's first rule ("Claude never decides Proven"). Its replacement: **Claude can mark a topic Learned only with the owner's own explanation, word for word, as evidence.** The owner can always undo it.

## 1. The screen

One page, `/engineering`. Eleven screens become one.

| Part         | What it shows                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Header       | The goal, the progress line ("5 of 14 learned · Now: Effects & dependencies") over a bar, **Plan new roadmap** and **Claude setup** |
| Roadmap      | Goal → chapters → topics. A graph by default, with **Lanes** as the other view                                                      |
| Topic panel  | Opens when a topic is clicked (below)                                                                                               |
| Claude setup | Connect Ken OS, the Project instructions and the Project link (9f)                                                                  |

**The graph** shows only the current chapter's topics. Other chapters are single nodes with a count ("React · 1 of 3") and expand on click. Zoom and drag move around the rest. Use a maintained graph library, not hand-built layout. **Lanes** shows chapters as columns, in order, with topics stacked as cards; on a phone the columns stack.

**The topic panel**, top to bottom:

1. Title, chapter, and the state. A menu sets Not started, Skipped or Learned; choosing Learned yourself asks for one line on why.
2. **Ask Claude**: the dialog that copies the starter message.
3. **Try it in code**: opens a wide panel over the roadmap with the task, the editor, Run tests and the results. Optional; it holds today's exercise, versions, browser check and autosave unchanged.
4. **Reports** from Claude, newest first.
5. **Notes**, with **Add note**.

A mockup of the graph, lanes and panel was reviewed in chat on 13 Oct 2026.

## 2. Topic states

| State       | Set by                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| Not started | The default; or the owner, to undo                                           |
| In progress | Claude's first report on the topic                                           |
| Learned     | Claude, with evidence (below); or the owner, with one line on why            |
| Skipped     | The owner on the roadmap, or Claude when the owner says they already know it |

- **Learned needs evidence.** `report_progress` refuses Learned without the owner's explanation, word for word, given without hints, plus Claude's one-line note on how they got there. Both show in the topic's reports.
- **The owner can undo anything.** Claude can't undo a state the owner set.
- **Nothing fades.** `get_current_state` lists Learned topics older than 60 days so Claude can offer a refresh. Nothing changes on its own.
- **State is rebuilt from events,** as today: `lab_topic_events` stays the source of truth and the cached state is recomputed on each new event.

## 3. Roadmaps

- **Planned in Claude.** The empty roadmap says "No roadmap" with **Plan with Claude**. Claude asks the goal and what the owner has worked on, proposes chapters and order, and calls `save_roadmap` once the owner agrees. It skips a topic only when the owner says they know it or can explain it, never from their background alone (§3a).
- **Built mostly from the reviewed topic map** (`content/engineering-lab/`). Claude may add topics of its own: a title, its chapter, and 3 to 5 "what you should be able to explain" lines, which Learned is judged against the way reviewed topics use their approved points. They show "Added by Claude".
- **One active roadmap.** A new one archives the old. Progress belongs to topics, not roadmaps, so it carries across.

## 3a. No resume tool

Decided 13 Oct 2026, before slice 3: Ken OS won't build `get_resume` or a resume link in Settings.

- **A resume says what someone built, not what they understand.** The roadmap is concept-level, and skipping topics from a resume would skip the gaps that matter. Effects & dependencies, the owner's first topic in Claude, is one their React work would have "covered".
- **Planning is rare.** A roadmap is planned a few times a year, so a tool, a link between Engineering and the Resume module, and a setting don't pay for themselves.
- **The value is free elsewhere.** The owner can tell Claude their background in a sentence, or add their resume file to the Claude Project's knowledge once, with no Ken OS code.

Skipping stays the owner's call: they say they know a topic, or explain it.

## 4. Notes

A list of short notes per topic. Each is marked You or Claude, with a date. The owner can add, edit and delete any note; Claude can only add, through `save_note`. Vocabulary goes in notes too for now; a `save_term` tool for the Terms page can come later if notes fill up with definitions.

## 5. Claude's tools

Nine, all in `features/engineering-lab/agent-tools.ts`: the eight from slice 1 and `save_roadmap`. (The first version of this table also listed `get_resume`, ten rows in all; it was dropped, §3a.) The 40-saves-a-day limit, owner-only sign-in and Disconnect are unchanged.

| Tool                | Change                   | Does                                                                                                                           |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `get_current_state` | Changed                  | Goal, current topic, counts, Learned topics older than 60 days                                                                 |
| `get_roadmap`       | Renamed from `list_path` | The active roadmap: chapters and topics with states                                                                            |
| `get_topic`         | Changed                  | State, points or "explain" lines, reports, notes, the exercise (never the solution)                                            |
| `get_my_work`       | Kept                     | Autosaved code and the last test run                                                                                           |
| `get_history`       | Changed                  | Reports and notes, instead of proofs                                                                                           |
| `save_exercise`     | Kept                     | A new exercise version, checked in the browser                                                                                 |
| `report_progress`   | New                      | `(topicId, summary, state?, evidence?)`. Adds a report; first report sets In progress; Learned needs evidence; Skipped allowed |
| `save_note`         | New                      | Adds a Claude note to a topic                                                                                                  |
| `save_roadmap`      | New                      | Saves a roadmap the owner agreed to: goal, chapters, topics, Claude's added topics                                             |

Removed: `save_lesson`, `save_proof_question`. The rule that replaces "no tool can grade": **no tool can mark Learned without the owner's words as evidence, and no tool can undo the owner's changes.**

## 6. What goes

- Ken OS's own lessons, the Tutor, the Researcher and source packets
- The 5-question assessment, its results and the evidence pages
- Graded proofs (the Prove tab) and the Assessor
- Daily Practice and review dates
- The weekly radar
- The "AI uses left" count

Engineering stops using OpenAI. Terms keeps it.

## 7. Data

| Change                | How                                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Roadmaps              | New `lab_roadmaps`: id, user, goal, ordered chapters and topic ids, `active` or `archived`, created time                           |
| Claude's added topics | New `lab_custom_topics`: id, user, chapter, title, 3 to 5 lines. Ids look like `custom.<slug>`                                     |
| Reports and states    | New event kinds in `lab_topic_events`: `report`, `state_set`. A report carries the summary, and for Learned the evidence and note  |
| Notes                 | New `lab_notes`: id, user, topic, author (`owner` or `claude`), text, created and updated times                                    |
| Carried over          | Proven → Learned, with the proof answer as evidence. Learning and Practicing → In progress. Exercise code and drafts stay          |
| Archived              | Assessments, practice sets, radar items, source packets, lessons and questions stop being read, and are dropped in a later release |

Add tables first and drop old ones in a later release, per the migration rule in `AGENTS.md`.

## 8. Links

Every old Engineering URL redirects to `/engineering`: `/engineering/learn/<topic>` opens that topic's panel, and the Profile, Practice, assessment and evidence URLs open the page plainly. The old `/lab` redirects point here too.

## 9. Slices

| #   | Branch                                 | Covers                                                                                                                                    |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `feat/engineering-reports-notes`       | Data (§7), the four states, `report_progress`, `save_note`, the changed and renamed tools, the carry-over. Usable in Claude straight away |
| 2   | `feat/engineering-roadmap-page`        | The one-page screen (§1), beside the old screens                                                                                          |
| 3   | `feat/engineering-plan-with-claude`    | `save_roadmap`, Claude's added topics, the empty state and Settings                                                                       |
| 4   | `chore/engineering-retire-old-screens` | Redirects (§8), old screens and OpenAI use removed, docs and Project instructions updated                                                 |

## 9a. Slice 1 as built

Built 13 Oct 2026 on `feat/engineering-reports-notes`. Where these differ from the sections above, these win.

| File                                                    | Holds                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/domain/src/engineering-lab/status.ts`         | The four statuses, rebuilt from events; who may change them; the 60-day refresh list                   |
| `apps/web/src/features/engineering-lab/status-store.ts` | Statuses for every topic, `reportProgress`, the owner's `setStatus`, reports, notes                    |
| `apps/web/src/features/engineering-lab/agent-tools.ts`  | The slice 1 tools (below)                                                                              |
| `drizzle/0014_faithful_chronomancer.sql`                | `lab_notes`, and `status`, `summary`, `evidence`, `evidence_note` on `lab_topic_events`. Additive only |

**Decisions**

- **Event kinds** are `report` (Claude) and `status_set` (the owner), not `state_set`. The old progress ignores both, so today's screens are unchanged.
- **The carry-over needs no data migration.** Statuses are computed from all of a topic's events, old kinds included: any old activity is In progress, and a proof passed while the exercise stood passed is Learned.
- **Claude never changes a status the owner set,** with one exception: a report may restart a topic the owner reset to Not started. Claude can't set Not started at all.
- **Evidence** for Learned is at least 40 characters of the owner's own words plus Claude's note on how they got there. The tool refuses Learned without both, and refuses evidence on any other status.
- **The current topic** is the most recently changed In progress topic, else the first Not started topic on the roadmap.
- **The write limit** counts Claude's reports and notes with its saved exercises: 40 a day together.
- **Roadmap tables** (`lab_roadmaps`, `lab_custom_topics`) move to slice 3, where they're first used. Until then the roadmap is the target role's path, as before.
- **Tools in slice 1** (8): `get_current_state`, `get_roadmap`, `get_topic`, `get_my_work`, `get_history`, `save_exercise`, `report_progress`, `save_note`. `save_roadmap` comes in slice 3; `get_resume` was dropped (§3a). `save_lesson` and `save_proof_question` are gone; the store functions behind them stay until slice 4 removes the old screens.
- **The owner's status menu and note editing** exist in `status-store.ts` but have no routes yet; slice 2 adds them with the screen.
- **Project instructions** were updated for reports, evidence and notes (`docs/product/claude-project-instructions.md`).

**Verified:** `pnpm test` (`status.test.ts`, `agent-tools.test.ts`), `pnpm check`, `pnpm build`, `test:db:engineering` (12 checks) and `test:db:connector` (8 checks) against local Postgres.

## 9b. Slice 2 as built

Built 13 Oct 2026 on `feat/engineering-roadmap-page`. The new page lives beside the old screens until slice 4.

| File                                                                                     | Holds                                                                                                               |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/app/engineering/roadmap/page.tsx`                                                   | The page, at `/engineering/roadmap`. `?topic=<id>` opens that topic's panel                                         |
| `src/components/engineering/roadmap/`                                                    | The page shell, the graph, the lanes, the topic panel, the code panel, and status labels                            |
| `src/components/engineering/exercise.tsx`                                                | The exercise editor, moved out of `topic.tsx` so both pages use it                                                  |
| `src/features/engineering-lab/roadmap-store.ts`                                          | The roadmap with statuses, the current topic and counts. Claude's `get_current_state` and `get_roadmap` read it too |
| `src/features/engineering-lab/roadmap-layout.ts`                                         | Where each graph node sits, as a pure function with tests                                                           |
| `/api/lab/topics/[id]/panel`, `/status`, `/notes`, `/code` and `/api/lab/notes/[noteId]` | The panel's data, the owner's status menu, notes, and the code panel                                                |

**Decisions**

- **Graph library:** `@xyflow/react` 12.12.0 (React Flow, MIT). Its attribution link stays visible, as its authors ask of non-subscribers. Themed with Ken OS tokens, so it follows light and dark mode.
- **The graph opens zoomed on the goal and the current chapter's topics,** readable at once. With 13 chapters the whole ring at once was too small to read. The fit button shows everything.
- **Graph nodes must stay selectable** in React Flow's sense, or React Flow turns off pointer events and clicks never reach the buttons. Selection shows nothing.
- **The layout choice** (Graph or Lanes) is kept in this browser only.
- **Settings** shows the goal with **Change goal** (the existing Direction page until slice 3) and Connections. **Plan new roadmap with Claude** arrives in slice 3.
- **A bug fixed on the way:** the exercise editor's data prop was named `panel`, the same as the card style it imports, so the editor had lost its card border since the connector work. It's now `data`.
- **The sidebar** has Roadmap first, above the old four, until slice 4 removes them.

**Verified:** `pnpm test` (`roadmap-layout.test.ts` and the rest), `pnpm check`, `pnpm build`. On the local server, signed in: the graph renders and opens on the current chapter; a real click on a topic opens its panel and puts it in the address; Skipped saves and updates the panel, the progress line and the graph; Learned asks why first; a note adds and deletes; Try it in code opens the exercise with the editor; Lanes shows all chapters and is remembered; chapters expand and collapse. `test:db:engineering` (12 checks) and `test:db:connector` (8) pass.

## 9c. Slice 3 as built

Built 13 Oct 2026 on `feat/engineering-plan-with-claude`.

| File                                        | Holds                                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `drizzle/0015_adorable_forge.sql`           | `lab_roadmaps` (one active per owner, enforced by a partial unique index) and `lab_custom_topics`. Additive only                                                                           |
| `features/engineering-lab/roadmap-plan.ts`  | Checks a plan Claude proposes: map chapters keep their reviewed titles, new chapters and topics get `custom.<slug>` ids, each new topic has 3 to 5 lines, no topic twice. Pure, with tests |
| `features/engineering-lab/any-topic.ts`     | One lookup for a map topic or one Claude added, used by all the Claude-first code                                                                                                          |
| `features/engineering-lab/roadmap-store.ts` | `saveRoadmap` (archives the old one), and the roadmap read from the saved plan, falling back to the target role's path                                                                     |
| `save_roadmap` in `agent-tools.ts`          | The ninth tool                                                                                                                                                                             |

**Decisions**

- **Without a saved roadmap,** the page and Claude's tools still use the target role's path (or every chapter). The page shows "No roadmap" with **Plan with Claude**, and `get_current_state` returns `planned: false` so Claude can offer to plan.
- **Plan with Claude** and Settings' **Plan new roadmap** open the Ask Claude dialog with a planning message. The dialog now takes any message.
- **Change role** shows in Settings only while there's no saved roadmap, since the role only shapes the fallback path.
- **Claude's topics** sit under "Added by Claude" and show their lines as "what to explain". They have no repo exercise: **Try it in code** says "No exercise yet" until Claude saves one, then runs the browser check in the panel before showing it.
- **Claude's topic ids are per owner.** Another owner can't read them.
- **Old screens stay map-only.** Events and progress accept `custom.*` ids; everything else on the old screens is removed in slice 4.
- **A trap found on the way:** `tsc --noEmit` reuses `tsconfig.tsbuildinfo` and once reported no errors when there were some. `pnpm build` type-checks fresh and caught nothing wrong in earlier slices, but delete the file when a type check looks too clean.
- **Don't run Prettier on `src` from inside `apps/web`.** `.prettierignore`'s paths are relative to the repo root, so from there it rewrites the generated files and the shadcn primitives. Run it from the repo root.

**Verified:** `pnpm test` (175, including `roadmap-plan.test.ts`), `pnpm check`, `pnpm build`, `pnpm format:check`, `test:db:engineering` (14 checks, 2 new for planning) and `test:db:connector` (8). On the local server, signed in: "No roadmap" with Plan with Claude; after saving a test roadmap through `save_roadmap`, the goal as the title, counts for its 2 topics, a link opening Claude's topic with its lines, "No exercise yet", then a Claude exercise checked in the browser and shown as version 1; Settings with Plan new roadmap and no Change role. The test roadmap was archived afterwards.

## 9d. Slice 4 as built

Built 13 Oct 2026 on `chore/engineering-retire-old-screens`.

- **Engineering is one page,** at `/engineering`. The roadmap page moved there from `/engineering/roadmap`.
- **Redirects** live in one list, `engineeringRedirects` in `routes.ts`, served from `next.config.ts`: `/engineering/roadmap`, every old Engineering page, and `/lab`. A topic's old address (`/engineering/learn/<id>`, `/lab/topics/<id>`) opens that topic's panel. Temporary (307) at first; made permanent (308) on 13 Oct 2026 at the owner's call. Tested in `routes.test.ts`. The `/lab` redirect pages and `legacy-redirect.ts` are gone.
- **Removed:** Overview, Profile, Learn, Practice, Intake, the assessment and its results, Direction, the evidence page and the old topic page; their API routes (`direction`, `intake`, `practice`, `radar`, `runs`, and a topic's `lesson`, `opened` and `proof`); and the assessment, practice, radar and path stores. The topic store keeps only test runs and Show solution; the shared store keeps only events and exercise progress.
- **Kept:** the exercise routes (runs, check, switch, draft, solution), the probe playground routes, and the new page's routes.
- **No OpenAI in Engineering.** Nothing in Engineering imports `@ken-os/agents`; the AI-use limit, source packets and the Researcher scripts (`lab:research`, `lab:import-sources`) are gone. Terms still uses OpenAI.
- **No assessment gate.** Claude's tools and Terms lookups no longer close during an assessment, since there is none.
- **The default roadmap** without a saved one is the target role's chapters in course order (no assessment scores to reorder them), or every chapter. The role can't be changed in the app any more; plan a roadmap with Claude instead.
- **The home page's Engineering line** shows the goal and "N of M learned".
- **Tables dropped (13 Oct 2026, migration `0016_drop_old_engineering_tables`):** the 13 tables nothing read any more (`lab_source_packets`, `lab_lessons`, `lab_runs`, `lab_run_answers`, `lab_questions`, `lab_daily_sets`, `lab_radar_items`, and the rebuild's retired `lab_assessment_runs`, `lab_assessments`, `lab_chapter_screens`, `lab_attempts`, `lab_solution_reveals`, `lab_progress_changes`), and `lab_profile`'s `intake`, `weekly_hours`, `conversation`, `added_chapters` and `radar_checked_week`. `lab_topic_events` keeps its old proof and review columns as history; only its foreign key to `lab_questions` went.
- **Dead code removed (13 Oct 2026, `chore/remove-engineering-dead-code`):** the Researcher, Tutor, Assessor and radar agents in `packages/agents`; the hand-written lesson, the 5 assessment questions and the saved source packet in `content/engineering-lab`, with their `authoredTopics` and `assessment` exports; and the domain code only the removed screens used (assessment, practice, grading, lessons, profile levels, radar, source packets). The old tables were kept until the next entry dropped them.

**Verified:** `pnpm test` (172), `pnpm check`, `pnpm build`, `pnpm format:check`, `test:db:engineering` (8 sections, rebuilt around what's left) and `test:db:connector` (8).

## 9e. Claude links in the app

Built 13 Oct 2026 on `feat/claude-links-in-app`, at the owner's request.

- **The Claude Project link** is set in Settings (**Claude Project**) and stored in `lab_profile.claude_project_url`. `KEN_OS_CLAUDE_PROJECT_URL` is only a fallback until one is saved; clearing the field falls back to it again. Without either, Ask Claude stays hidden.
- **A chat per topic, optional.** **Link chat** in the topic panel takes the chat's address; **Continue chat** then opens it, and **Change chat** replaces or clears it. Stored in `lab_topic_chats`, one per topic, per owner. Claude can't know its own chat's address, so only the owner sets it; Ask Claude stays for starting fresh.
- **One rule for both links:** https on `claude.ai` (`claudeLink` in `ask-claude.ts`), checked on the server; anything else is refused with "Use an https claude.ai link".
- **Recall in Claude:** the Project instructions now ask Claude to call `get_history` first whenever a topic comes up, so a fresh chat knows what was covered, explained and noted, linked chat or not.
- **Migration** `0019_rainy_wong.sql` only adds the column and the table.

**Verified:** `pnpm test`, `pnpm check`, `pnpm build`, `pnpm format:check`; `test:db:engineering` (9 sections, 1 new for links) and `test:db:connector` (8). On the local server with no env link: no Ask Claude; a non-Claude link refused in Settings; a saved Project link brings Ask Claude back; Link chat saves and shows Continue chat opening that chat in a new tab. The pane was minimized, so these ran through the page script and form input rather than real clicks. Test links were cleared afterwards.

## 9f. Claude setup

Built 13 Oct 2026 on `feat/claude-links-in-app`, at the owner's request: everything Claude needs, in one place in the app.

- **One panel, three steps.** **Claude setup** in the header opens it. Each step shows its state as a badge:
  1. **Connect Ken OS:** the connector address (`<app>/api/mcp`) with **Copy**, the path in Claude, and the connections with **Disconnect**. State: Connected or Not connected.
  2. **Project instructions:** **Copy instructions**, **Show all**, and the date they last changed. State: Updated with the date.
  3. **Project link:** the field from 9e, plus **Open Project**. State: Saved or Not set.
- **Settings is gone.** Connections and the Project link moved into Claude setup, and **Plan new roadmap** into the header (shown once a roadmap is saved). Without a Project link, the "No roadmap" notice offers Claude setup instead of Plan with Claude.
- **The instructions have one source:** `CLAUDE_PROJECT_INSTRUCTIONS` in `features/engineering-lab/claude-instructions.ts`, with `CLAUDE_INSTRUCTIONS_UPDATED`. `docs/product/claude-project-instructions.md` points there. Change them in a reviewed commit and update the date, so the owner knows to paste them again. `claude-instructions.test.ts` checks that every tool they name exists, that the ones the flow relies on are named, and that there are no em dashes.
- **Ken OS can't tell** whether the Project has the latest instructions, since claude.ai doesn't expose them. The date is the signal.
- No new tables or routes.

**Verified:** `pnpm test` (149, including `claude-instructions.test.ts`), `pnpm check`, `pnpm build`, `pnpm format:check`, `test:db:engineering` and `test:db:connector`. On the local server at phone width, with real clicks: the panel with all three steps, Copy on the address, Show all, a saved Project link turning step 3 to Saved with Open Project, and the "No roadmap" notice switching from Claude setup to Plan with Claude. Plan new roadmap in the header wasn't seen, since the local database has no saved roadmap. The test link was cleared afterwards.

## 10. Done when

1. Claude plans a roadmap from a goal and a conversation about the owner's background, and it appears on `/engineering`.
2. A report from Claude moves a topic to In progress and shows in its panel.
3. Claude can mark Learned only with the owner's explanation; the evidence shows on the topic.
4. The owner can skip, undo and add, edit and delete notes; Claude can add notes but not change the owner's.
5. Try it in code still checks Claude's exercises in the browser and autosaves.
6. Old links land on the right topic. Engineering makes no OpenAI calls.
7. `pnpm test`, `pnpm check` and `pnpm build` pass, and steps 1 to 6 work on the hosted app.
