# Engineering: one path from setup to a finished roadmap

Status: proposed, 13 Oct 2026. Builds on [engineering-claude-first.md](engineering-claude-first.md), which stays the source of truth for the screen, topic states, Claude's tools and data. Decided in chat with the owner on 13 Oct 2026.

## Decision

Today each stage works on its own: set up Claude, plan a roadmap, learn, practise, prove. Nothing leads from one to the next, and nothing happens when a chapter or the roadmap is done. This spec joins them into one path:

| Stage       | Today                              | After                                                           |
| ----------- | ---------------------------------- | --------------------------------------------------------------- |
| 1. Set up   | Claude setup, if you find it       | A checklist at the top of the page until setup is done (§1)     |
| 2. Plan     | "No roadmap" with Plan with Claude | The checklist's last item (§1)                                  |
| 3. Learn    | Loose actions in the topic panel   | Steps in the panel: Learn → Practice → Prove (§2)               |
| 4. Practice | Try it in code                     | Step 2, optional (§2)                                           |
| 5. Prove    | Explain it to Claude               | Step 3 (§2)                                                     |
| 6. Next     | "Now: X" in the progress line      | **Next topic** in the panel once a topic is Learned (§3)        |
| 7. Finish   | Nothing                            | Chapter done in the panel and graph; a roadmap summary (§3, §4) |

Not in scope: reminders to revisit old topics (the owner chose "not now"). `get_current_state` already lists Learned topics older than 60 days for Claude to offer.

## 1. Setup checklist

Shows at the top of `/engineering`, in place of the "No roadmap" box, until all four items are done. Each item is a row with its state and one action.

| Item                 | Done when                                                | Action           |
| -------------------- | -------------------------------------------------------- | ---------------- |
| Connect Ken OS       | A connection exists (Claude setup, step 1)               | Claude setup     |
| Project instructions | Claude reported the current instructions version (below) | Claude setup     |
| Project link         | A Project link is saved, or the env fallback is set      | Claude setup     |
| Plan roadmap         | A roadmap is saved (`planned`)                           | Plan with Claude |

- **Order is a suggestion.** Every item's action works at any time; rows are numbered so the first visit reads top to bottom.
- **Title:** "Set up" with a count ("2 of 4"). No sentences beyond a one-line helper per row.
- **Once all four are done, it hides.** It doesn't come back. A later problem shows on the **Claude setup** button instead: a Badge "Update" when the instructions are out of date, "Not connected" when the last connection was removed.

### Knowing the instructions were pasted

Ken OS can't read the Claude Project, so the instructions report their own version.

- `CLAUDE_INSTRUCTIONS_UPDATED` (already in `claude-instructions.ts`) becomes the version. The instructions text gains one line: call `get_current_state` with `instructionsVersion: "<that date>"`.
- `get_current_state` takes an optional `instructionsVersion` (a `YYYY-MM-DD` string; anything else is ignored). Ken OS stores the last one seen and when.
- States, shown in the checklist and in Claude setup step 2:
  - **Pasted** when the stored version equals the current one.
  - **Out of date** when it's older. The step shows "Copy instructions" as the main button.
  - **Not yet** when none has been seen.
- A test checks the instructions text names the same version as `CLAUDE_INSTRUCTIONS_UPDATED`, so the two can't drift.

## 2. Steps inside a topic

The topic panel shows the topic's own path under the title, the same one Claude follows in chat:

| Step     | Done when                                        | Its action                                      |
| -------- | ------------------------------------------------ | ----------------------------------------------- |
| Learn    | The topic is In progress (Claude's first report) | **Ask Claude**, or **Continue chat** if linked  |
| Practice | An exercise run passed all its tests             | **Try it in code**                              |
| Prove    | The topic is Learned                             | **Prove it**: Ask Claude with a proving message |

- **Practice is optional.** It shows "Optional", and Prove is open whether or not it's done. A topic with no usable exercise shows Practice as "No exercise yet" and skips to Prove.
- **One main button:** the first step not done gets the filled button; the others stay outline. All stay usable.
- **Prove it** opens the Ask Claude dialog with: "Check me on <title> (Ken OS topic `<id>`). Ask me to explain it in my own words." Claude already won't mark Learned without the owner's words.
- **Skipped and Learned topics** show the steps as done or skipped; the main button moves to Next topic (§3).
- Reports, notes, the state menu and Link chat stay where they are, below the steps.

## 3. Next topic and chapter done

- **Next topic** is the next topic in roadmap order that isn't Learned or Skipped, starting after this one and wrapping to earlier ones. Claude can still suggest something else in chat.
- **When a topic is Learned,** its panel shows **Next topic: <title>** as the main button.
- **When that topic finishes its chapter** (every topic in it Learned or Skipped), the panel shows "Chapter done" with the chapter name and count ("React · 3 of 3"), then **Next topic** from the next chapter. The chapter's node in the graph and its lane show "Done".
- **Claude says it too.** `report_progress` returns `next` (id and title) and `chapterDone` (the chapter title, or null) when it sets Learned, so Claude can mark the moment in chat. The instructions gain one line for it.
- No animation, no confetti: a state and a button.

## 4. Roadmap summary

When every topic on the roadmap is Learned or Skipped:

- **The page** shows "Complete" where the progress line was, with the date of the last Learned topic.
- **A summary** replaces the roadmap's top area: per chapter, each topic with its state, the date, and the owner's evidence line (the first sentence, with the full text in the topic panel). Counts at the top: learned, skipped, chapters, and the span from the first report to the last Learned.
- **Plan next roadmap** is the main button. The graph and lanes stay below for browsing.
- **Archived roadmaps** have no summary page in this spec. Their progress stays on the topics, as today. A list of past roadmaps can come later.

## 5. Data

| Change                            | How                                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Instructions version seen         | Two nullable columns on `lab_profile`: `claude_instructions_version`, `claude_instructions_seen_at` |
| Practice step                     | Read from existing `exercise_run` events (`passed`); no change                                      |
| Next topic, chapter done, summary | Computed from the roadmap view; no change                                                           |

One additive migration, per the migration rule in `AGENTS.md`.

## 6. Slices

| #   | Branch                             | Delivers                                                                                                                                                    |
| --- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `feat/engineering-setup-checklist` | §1: the checklist, the instructions version through `get_current_state`, Claude setup badges                                                                |
| 2   | `feat/engineering-topic-steps`     | §2 and §3: the steps in the topic panel, Prove it, Next topic, chapter done in panel, graph and lanes, `report_progress` returning `next` and `chapterDone` |
| 3   | `feat/engineering-roadmap-summary` | §4: Complete, the summary and Plan next roadmap                                                                                                             |

Each slice ships with tests (unit for the step and next-topic rules, `test:db:engineering` for the stored version and the summary), and is checked on the local server signed in, with screenshots.

## 6a. Next: several roadmaps at once

Asked for by the owner on 13 Oct 2026, to build after slice 3, once the path above shows where it fits. Not designed yet; it needs its own round of questions.

- **Today** a new roadmap archives the old one (`save_roadmap`, one `active` row in `lab_roadmaps`).
- **The idea:** create a roadmap alongside the existing ones, and keep several going together.
- **What the slices above should keep in mind,** so they don't have to be redone:
  - The checklist's "Plan roadmap" means "at least one roadmap", not "the" roadmap.
  - Next topic and chapter done are computed per roadmap, never across all of them.
  - The summary (§4) belongs to one roadmap, so it can later live at that roadmap's own address.
  - Progress already belongs to topics, not roadmaps, so a topic on two roadmaps is Learned on both.
- **Open questions for then:** how to switch between roadmaps on the page, what "Now" and the progress line show with several, whether Claude's tools take a roadmap id, and whether archiving stays.

## 7. Done when

1. A fresh account sees the checklist; after connecting, pasting the instructions, saving the link and planning, it's gone.
2. Changing the instructions makes Claude setup show "Update" until Claude reports the new version.
3. A topic's panel shows where it is in Learn → Practice → Prove, with the next step as the main button.
4. Learning the last topic of a chapter shows Chapter done and the next topic, in the app and in Claude's reply.
5. Finishing every topic shows the summary with the owner's evidence and Plan next roadmap.
6. `pnpm test`, `pnpm check` and `pnpm build` pass, and steps 1 to 5 work on the hosted app.

## 8. Slice 1 as built

Built 13 Oct 2026 on `feat/engineering-setup-checklist`.

- **The rules** are pure functions in `features/engineering-lab/claude-setup.ts`: `instructionsState`, `setupChecklist` and `setupAlert`, shared by the page and `claude-setup.test.ts`.
- **When the checklist hides,** without storing a flag: once Claude has reported any instructions version, a Project link exists and a roadmap is saved. A lost connection or newer instructions after that show on the Claude setup button ("Not connected" first, then "Update"), not as the checklist again. Clearing the Project link or having no roadmap brings it back, since those undo setup.
- **The version** goes through `get_current_state({ instructionsVersion })`, max 20 characters; only `YYYY-MM-DD` is kept, and an unchanged version isn't written again (`recordInstructionsVersion` in `claude-links.ts`). The instructions text now names it, built from `CLAUDE_INSTRUCTIONS_UPDATED`, so the two can't drift.
- **Rows 1 to 3** open Claude setup; row 4 is Plan with Claude once a Project link exists, else "Needs the Project link". The first row not done gets the filled button. The checklist replaces the old "No roadmap" box.
- **Claude setup step 2** shows Pasted, Out of date or Not yet, with "Version Oct 13" in its helper line.
- **Migration** `0020_equal_annihilus.sql` adds the two nullable columns to `lab_profile`.
- **The owner pastes the instructions once more** after merge: the current text is the first to carry the version line, so the checklist shows Not yet until then.

**Verified:** `pnpm test` (164, 7 new in `claude-setup.test.ts`), `pnpm check`, `pnpm build`, `test:db:engineering` (10 sections, 1 new: the version is kept, junk and over-long values are refused or ignored, unchanged versions aren't rewritten, versions are per owner) and `test:db:connector` (8). On the local server, signed in: the checklist at 0 of 4; a row opening Claude setup with Not connected, Not yet and Not set; a saved Project link turning row 3 Done and row 4 to Plan with Claude; a script acting as Claude reporting an older version (Out of date) and then the current one (2 of 4); a saved test roadmap hiding the checklist, with Plan new roadmap and a "Not connected" badge in the header. The "Update" badge needs a live connection, so it's covered by the unit test only. Another session held port 3000, so this ran on 3001; one Project link save went through a page request after the pane resized mid-click. Test data was removed afterwards.

## 9. Slice 2 as built

Built 14 Oct 2026 on `feat/engineering-topic-steps`.

- **The rules** are pure functions in `features/engineering-lab/topic-steps.ts`: `topicSteps` (the three steps and which one gets the main button), `nextTopic`, `chapterDone` and `isChapterDone`, tested in `topic-steps.test.ts`.
- **The Practice step** comes from `practiceState` in `exercise-store.ts`: Passed once any run on the topic passed, Tried after a failing run, Optional before one, and "No exercise yet" when the topic has no usable version. A passing run counts even on a topic with no usable version now.
- **In the panel** (`components/engineering/roadmap/topic-steps.tsx`), the steps sit above the status menu and replace the old row of buttons. Each step keeps its button after it's done (Continue chat or Ask Claude, Try it in code), so a topic can be revisited, except Prove once the topic is Learned or Skipped. Link chat stays below.
- **Next topic and Chapter done** show in a box at the top of the steps once a topic is Learned or Skipped. With nothing left, it says "Every topic on the roadmap is done" until slice 3 adds the summary.
- **Graph and lanes:** a finished chapter reads "Done · 4 of 4" instead of "4 of 4 learned". The graph layout carries a `done` flag per chapter.
- **Claude's side:** `report_progress` adds `next` (id and title) and `chapterDone` (the chapter title, or null) only when it sets Learned or Skipped. The Project instructions are unchanged, so there's nothing to paste again: the field names say what they are, and Claude reads tool results.
- **Also fixed:** in Lanes, the whole page scrolled sideways on medium screens because the main area grew to fit every lane. `SidebarInset` in `workspace-shell.tsx` now has `min-w-0`, so only the lanes scroll.
- No migration.

**Verified:** `pnpm test` (177, 7 new across `topic-steps.test.ts` and `roadmap-layout.test.ts`), `pnpm check`, `pnpm build`, `test:db:engineering` (11 sections, 1 new: the Practice step for a passing run, a repo lab not yet run and no exercise; Next topic and chapter done in the panel and in `report_progress` for Learned and Skipped, and not for a plain report) and `test:db:connector` (8). On the local server, signed in, with real clicks: a new topic with Learn as the main button; In progress moving it to Try it in code; Learned on the last topic of a chapter showing Chapter done with Next topic, which opened that topic; Lanes reading "Done · 4 of 4" with the page no longer scrolling sideways. The chapter's other three topics were set Learned through a page request to save time. Test statuses were set back to Not started and the test link cleared; their reports stay in the local database's history.

## 10. Slice 3 as built

Built 14 Oct 2026 on `feat/engineering-roadmap-summary`.

- **The rules** are pure functions in `features/engineering-lab/roadmap-summary.ts`: `isComplete`, `roadmapSummary` and `firstSentence`, tested in `roadmap-summary.test.ts`. `getRoadmapSummary` in `roadmap-store.ts` feeds them the roadmap topics' reports and status changes in one query, and only once the roadmap is complete.
- **Each topic's words** come from its latest Learned event: Claude's evidence (the owner's explanation), or the owner's own reason when they marked it themselves. Skipped topics show no words. The line is the first sentence, cut at 160 characters; the full text stays in the topic panel.
- **Dates:** a topic's date is its latest Learned or Skipped event. The span runs from the first report on any of the roadmap's topics to the last Learned, so it includes work from before this roadmap was planned.
- **On the page:** "Complete · <date> · 2 of 3 learned" replaces the progress line, and the bar fills. The summary sits above the graph or lanes, with **Plan next roadmap** as its main button; the header's Plan new roadmap hides while it shows. Topic names in the summary open their panels.
- **It works for the role's default path too,** since it reads whatever roadmap the page shows.
- No migration, and no change to Claude's tools.

**Verified:** `pnpm test` (182, 5 new in `roadmap-summary.test.ts`), `pnpm check`, `pnpm build`, `test:db:engineering` (12 sections, 1 new: a finished roadmap's counts and words, and none for an unfinished one) and `test:db:connector` (8). On the local server, signed in: a test roadmap saved and finished by a script acting as Claude (two Learned with evidence, one Skipped) showed Complete with the date, the summary with counts, dates and first sentences, Plan next roadmap, and a topic opening from it with Chapter done and "Every topic on the roadmap is done". The test roadmap, its events and the test link were removed afterwards.
