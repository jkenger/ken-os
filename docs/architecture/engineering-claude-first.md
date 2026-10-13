# Engineering, Claude first

Status: approved by the owner, 13 Oct 2026, after a design review in chat. Not yet built. This is the source of truth for the Engineering module from now on. `engineering-rebuild.md` and `engineering-claude-connector.md` are history; where they disagree with this file, this file wins.

## Decision

**Claude teaches. Ken OS shows where you are.**

After the connector shipped, the owner learned Effects & dependencies entirely in their Claude Project and preferred it to the in-app flow. Claude checked their state, asked before telling, sent them to the exercise, read their code and asked for the explanation. So all learning moves to Claude. Ken OS keeps the roadmap, each topic's state, Claude's reports and the owner's notes, on one screen.

This reverses the connector spec's first rule ("Claude never decides Proven"). Its replacement: **Claude can mark a topic Learned only with the owner's own explanation, word for word, as evidence.** The owner can always undo it.

## 1. The screen

One page, `/engineering`. Eleven screens become one.

| Part           | What it shows                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| Header         | The goal, the progress line ("5 of 14 learned · Now: Effects & dependencies") over a bar, and **Settings** |
| Roadmap        | Goal → chapters → topics. A graph by default, with **Lanes** as the other view                             |
| Topic panel    | Opens when a topic is clicked (below)                                                                      |
| Settings panel | The goal with **Plan new roadmap with Claude**, the resume link, and Connections with Disconnect           |

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

- **Planned in Claude.** The empty roadmap says "No roadmap" with **Plan with Claude**. Claude asks the goal, reads the resume with `get_resume`, proposes chapters and order, and calls `save_roadmap` once the owner agrees.
- **Built mostly from the reviewed topic map** (`content/engineering-lab/`). Claude may add topics of its own: a title, its chapter, and 3 to 5 "what you should be able to explain" lines, which Learned is judged against the way reviewed topics use their approved points. They show "Added by Claude".
- **One active roadmap.** A new one archives the old. Progress belongs to topics, not roadmaps, so it carries across.

## 4. Notes

A list of short notes per topic. Each is marked You or Claude, with a date. The owner can add, edit and delete any note; Claude can only add, through `save_note`. Vocabulary goes in notes too for now; a `save_term` tool for the Terms page can come later if notes fill up with definitions.

## 5. Claude's tools

Nine, all in `features/engineering-lab/agent-tools.ts`. The 40-saves-a-day limit, owner-only sign-in and Disconnect are unchanged.

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
| `get_resume`        | New, read-only           | The selected resume's text, from the Resume module                                                                             |
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
| 3   | `feat/engineering-plan-with-claude`    | `get_resume`, `save_roadmap`, Claude's added topics, the empty state and Settings                                                         |
| 4   | `chore/engineering-retire-old-screens` | Redirects (§8), old screens and OpenAI use removed, docs and Project instructions updated                                                 |

## 10. Done when

1. Claude plans a roadmap from a goal and the resume, and it appears on `/engineering`.
2. A report from Claude moves a topic to In progress and shows in its panel.
3. Claude can mark Learned only with the owner's explanation; the evidence shows on the topic.
4. The owner can skip, undo and add, edit and delete notes; Claude can add notes but not change the owner's.
5. Try it in code still checks Claude's exercises in the browser and autosaves.
6. Old links land on the right topic. Engineering makes no OpenAI calls.
7. `pnpm test`, `pnpm check` and `pnpm build` pass, and steps 1 to 6 work on the hosted app.
