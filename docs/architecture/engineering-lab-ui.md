# Engineering Lab UI direction

Status: **built on 2026-10-03** (all seven steps; see "As built" at the end). Agreed with the owner on 2026-10-02. The original clickable mockups still run at `/design-preview?view=lab-ui` in development, with fake data and no AI calls. This is the "polish" the [v1 proposal](engineering-lab-v1.md) waits for, so it comes before the v1 features.

## The short version

- **A topic becomes four steps (Learn, Practice, Lab, Check)** with a step bar, instead of one long scroll. You can jump to any step; the suggested next one is marked.
- **Learn is a proper reader:** a sticky outline, a short core lesson, and optional "Go deeper" sections. The other steps show one thing at a time.
- **The course has a shape:** two tracks (Full-stack, AI Engineering), each with chapters and the full outline from handoff §24, including topics not written yet. A **"My gaps"** switch hides what assessment says you already know.
- **Today is one card:** "Continue: Event loop · Step 2 of 4 · Practice". Reviews and recent changes sit underneath.
- **Feedback shows exactly what was wrong:** a line-by-line diff for predictions and a rubric checklist for written answers, plus the explanation.
- **Look up any word, anywhere in Ken OS:** select text, press Explain (or `E`), get a short meaning and one trusted link, and save it to a new **Terms** page.
- **CodeMirror 6** replaces the plain text boxes, for writing and for showing code.
- **Still Ken OS:** same type, spacing and warm monochrome surfaces, plus new learning components. Colour is used only for meaning.

## What the first live test showed

From the owner's test on 2026-10-02:

- The topic page is one long scroll where everything has the same weight. It feels like an editor, not a learning page.
- You can't tell where you are in a topic or what comes next.
- Topics look scattered. It isn't clear which path they belong to: a full-stack course, or an AI engineering course.
- There's no way to look up an unfamiliar term without leaving for a new browser tab.

The bugs from the same test (the "why" being graded as output, answers vanishing on refresh, solid answers resubmitted) were fixed separately in PR #5.

## Decisions

| # | Question | Decision |
|---|---|---|
| Q2 | What should it feel like? | Short focused sessions by default, a workbench inside labs, and a full reader in the Learn step. |
| Q3 | Topic page shape | Steps with a step bar; labs use a split screen on desktop. |
| Q4 | Code editing | CodeMirror 6 (about 150 KB, works on phones), for writing and reading code. |
| Q5 | How far from the Ken OS look? | Ken OS base plus purpose-built learning components. Colour only for meaning. |
| Q6 | Phone or desktop first? | Split by task: desktop for lessons and labs; phone fully designed for daily practice, reviews and predictions. |
| Q7 | Feedback tone | Quiet and exact, a little warm, and diff-style for predictions. |
| Q8 | How the course is organized | Tracks, then chapters, then topics, like a book's table of contents. |
| Q9 | Reader and sessions | The Learn step is the reader; the other steps are focused. |
| Q10 | Lesson depth | A short core plus optional "Go deeper" sections. |
| Q11 | Moving between steps | Free. The step bar suggests, it never locks. |
| Q12 | Today | One main "Continue" card. |
| Q13 | Term lookup scope | Ken OS-wide, built and tried in the lab first. |
| Q14 | Where meanings come from | A short AI explanation for the selected context, plus one link from the Researcher's trusted sites. |
| Q15 | What saving does | A Terms list now, stored so daily practice can quiz saved terms later. |
| Q16 | What "warm" means | One short human line and a small check on a solid answer; one clear moment when a topic is proven. No confetti, sounds or points. |
| Q17 | Full course and gap focus | One course with a "My gaps" switch; known topics show "Known · skip". |
| Q18 | Topics nobody assessed | A 2 to 3 question placement check decides whether they're known or a gap. |
| Q19 | Topics not written yet | Shown in the outline, greyed, marked "Not written yet". |
| Q20 | Feedback on written answers | A rubric checklist: each point covered, partly covered or missed. |
| Q21 | Triggering a lookup | An "Explain" button beside any selection, plus the `E` shortcut. |
| Q22 | Saved terms page | "Terms", in the main Ken OS sidebar. |
| Q23 | Where this sits in the plan | It's the polish phase, before v1 features. The full-course outline moves up with it. |
| Q24 | What the write-up is | This doc plus clickable mockups in `design-preview`. |

Defaults the owner accepted without a separate question: term lookups get their own daily limit, so a reading-heavy day can't block lesson generation; on a phone, a lab shows Instructions and Code as two tabs; a topic without labs has no Lab step.

## Screens

### Today

- **One "Continue" card:** track and chapter, topic title, "Step 2 of 4 · Practice · 1 of 2 predictions done", a four-segment progress bar, one button, and a time estimate.
- **Underneath, smaller:** reviews due (each opens that topic's Check step) and recent status changes.
- **Daily practice** (v1) becomes a second card in the same place when it exists.

### Course

- **Track tabs:** Full-stack and AI Engineering, each with a one-line summary and "2 of 37 proven · 17 gaps to close".
- **Chapters** in order, each with "4 of 6 known or proven" and a thin progress bar.
- **Topic rows:** a number (1.2), the title, and a status. Unwritten topics are greyed and not clickable. Topics nobody has assessed offer **"Placement check · 3 questions"**.
- **"My gaps" switch:** hides topics that are proven or known from the baseline or a placement check. Unassessed topics stay. Chapters that are entirely unwritten say so ("8 topics planned, not written yet") rather than "no gaps", which would read as mastered.

### Topic

- **Header:** a breadcrumb (track, chapter), the title and the status.
- **Step bar,** sticky under the header. Each step shows a number or a check when done, its name, and one line of state ("Read", "1 of 2 done", "Not run yet", "2 questions"). The suggested step says "Suggested next". Nothing is locked; proof rules decide what counts, not the UI.
- **Learn:** a sticky outline that follows your scroll; a reading column about 680px wide; "The gap" marked with a left rule; the mental model on a tinted panel; the worked example in a read-only editor; "Go deeper" as collapsible sections; sources at the end; then "Next: Practice".
- **Practice:** one prediction at a time with "Prediction 1 of 2" and dots. Each answered one shows its result, the diff, your why, the explanation, then "Try again" and "Next".
- **Lab:** on desktop, instructions on the left (sticky) and the editor on the right, with Run tests, Reset and Show solution. On a phone, two tabs: Instructions and Code. Results show the pass count and each test.
- **Check:** questions as cards. After grading: the label and one line, your answer, then the diff (predictions) or rubric checklist (written answers), then the explanation. The confidence rating sits above the answer and says it doesn't change the grade.
- **Proven moment:** when a topic turns proven, a tinted banner at the top of Check names the topic, says how it was proven, and gives the first review date. That's the only celebration in the module.

### Term lookup and Terms

- **Select any text** under 60 characters on a Ken OS page, code included. A small "Explain `E`" button appears below the selection.
- **The popover** gives the term, two sentences of meaning written for the sentence you selected it from, one link from a trusted site, and "Save to Terms". Escape or scrolling closes it. You never leave the page.
- **Terms** (main sidebar): search, then each term with its meaning, where you found it (a link back), the source link, and when you saved it.

## Feedback rules

- **Every result answers three things:** the label, what exactly was wrong, and why the right answer is right.
- **Prediction diff:** the real output line by line against yours, matched with a longest-common-subsequence so one missing line doesn't shift everything after it.
  - A line that printed but somewhere else is "You had it here" and "Actually prints here".
  - A line you left out is "Missing from yours".
  - A line that never printed is "Never printed".
  - A one-line summary underneath counts each kind.
- **Rubric checklist:** the grader returns a result for each rubric point. The rubric stays hidden until you answer, so showing it afterwards gives nothing away.
- **Warmth:** one short, specific line on a solid answer ("That's the drain rule exactly"), never generic praise. No streaks, points, sounds or confetti, which also keeps to the handoff's §25 rule against heavy gamification.

## Visual rules

**Ken OS stays the base.** Manrope headings, Source Sans 3 body text, the warm monochrome tokens, the same radii and spacing. Nothing here is a framework default.

**New tokens, for meaning only.** They lived in `features/design-system/contract.ts` (added in step 1) and now live in the Ken OS design system in Claude, synced to `apps/web/design-system/tokens.json`, with Tailwind names such as `bg-status-solid-surface` and `text-status-solid`:

| Token | Text | Tint (`-surface`) | Text on tint | Text on page |
|---|---|---|---|---|
| `--status-solid` | `#2d6a45` | `#e5efe7` | 5.47:1 | 6.39:1 |
| `--status-partial` | `#7a5710` | `#f5ecd6` | 5.58:1 | 6.51:1 |
| `--status-gap` | `#9a2f2b` | `#f6e2df` | 5.99:1 | 7.40:1 |

- **Colour never works alone.** Every status also has words, and "Proven" and "Not assessed yet" have an icon.
- **Muted text fixed in step 1:** `--muted-foreground` was `#766f66`, only 4.40:1 on `--muted`. It is now `#6e675e`: 5.53:1 on the page, 4.95:1 on `--muted` and 4.65:1 on `--secondary`.
- **Ken OS has no dark theme yet.** When it gets one, these tokens need dark values measured separately.
- **Motion only where it explains something:** the step bar's underline, the "My gaps" switch, collapsible sections. No fade-in on scroll.

## Components to build

Shared across Ken OS (`components/ui` or a shared folder):

- **CodeEditor:** CodeMirror 6 with a Ken OS theme, editable or read-only.
- **TermLookup:** the selection button, the popover and the `E` shortcut, wrapping each module's page.
- **Pill:** a status label with tone (solid, partial, gap, neutral, quiet). It replaces the lab's current `Tag`.

Engineering Lab only (`components/lab`):

- **StepBar**, **PredictionDiff**, **RubricChecklist**, **CourseOutline** (tracks, chapters, rows, gap switch), **ContinueCard**, **ProvenBanner**.

The mockup versions live in `apps/web/src/components/lab-ui-preview/` and are the starting point.

## What the build needs beyond the UI

- **Course outline in content:** `topics.yaml` gains tracks and chapters, plus the names of unwritten topics (built as a `planned` list per chapter; see "As built"). `lab:generate` checks them.
- **Placement checks:** the Assessor's questions for a topic with no lesson first, recorded as kind `placement`. Passing marks the topic known. This was v1 section 8; it moves up.
- **Tutor `tutor-v3`:** adds `deeper: { title, body }[]` to lessons. Older lessons simply have none.
- **Grader:** returns `{ point, result }` for each rubric point alongside the label and feedback. The prompt version goes up.
- **Term lookup:** a `ken_terms` table (term, meaning, source URL, where found, saved at), a lookup endpoint that sends the selection plus its sentence and returns two sentences and one link from `SOURCE_DOMAINS`, and its own daily limit. The selected text is untrusted data in the prompt. Stored so daily practice can use saved terms later.
- **Progress per step:** the step bar's state comes from data that already exists (lesson read, practice attempts, lab runs, check answers). No new tables.

## Build order

1. **CodeEditor and Pill** in place of the text boxes and tags. *Check: every existing lab still runs, and contrast holds.* **Done 2026-10-03:** `components/ui/code-editor.tsx` and `components/ui/pill.tsx`; lab code, tests, solutions, questions and lesson code all use the editor.
2. **The topic page as steps**, Learn as a reader, labs as a split screen. *Check: on a phone and a desktop, you can always tell which step you're on.* **Done 2026-10-03:** step state comes from `features/engineering-lab/steps.ts`; the step is kept in `?step=`. On a phone the step bar drops the detail line so all four steps fit.
3. **Feedback:** the prediction diff, then the grader's rubric results and the checklist. *Check: the owner's "outer start, body" answer shows the two missing lines at a glance.* **Done 2026-10-03:** `diffLines` in the domain package; `grader-v2` returns per-point results, stored in `lab_attempts.rubric` (migration 0006). It does.
4. **Course outline,** "My gaps" and placement checks. *Check: the outline matches §24, and gap focus hides exactly the known topics.* **Done 2026-10-03:** the Topics page is now Course. See "As built" below for how the outline and placement differ from the plan.
5. **Today's Continue card.** **Done 2026-10-03:** Today and the topic page share `stepsForTopic`, so the card and the step bar always agree.
6. **Term lookup and Terms**, shared across Ken OS. *Check: a lookup never leaves the page, and a saved term links back to where it was found.* **Done 2026-10-03:** `features/terms`, `components/terms`, the `/terms` page, migration 0007.
7. **"Go deeper"** lesson sections (`tutor-v3`). **Done 2026-10-03.**

Then the v1 features, starting from its section 1 gate.

## As built (2026-10-03)

Where the build differs from the plan above, and why:

| Plan | Built | Why |
|---|---|---|
| Outline-only topic entries with ids | Each chapter in `topics.yaml` has a `planned` list of topic names | An unwritten topic has nothing to validate yet; a full entry needs a gap, proof modes and sources. It gets one when it's written. |
| Three tracks in the data (full-stack, production, ai) | Two: Full-stack and AI Engineering, with production engineering as Full-stack chapters | Matches the agreed two-track Course page. |
| "Known" from the baseline counts for everything | A passed placement check or a proof makes a topic known: it unlocks what builds on it and the Planner skips it. A baseline "solid" shows as "Known · skip" on Course, but still gets the short check the Planner already gave it | The baseline is never proof of anything new (handoff §26). |
| Lookups answer in about 2 seconds | About 6 seconds | Finding a real page on a trusted site needs one web search. A term already in Terms is answered instantly, without an AI call. |
| Lookup limit unspecified | 40 lookups a day, separate from the 20 lesson and question generations | A reading-heavy day shouldn't block lessons. |
| Mockups only in `lab-ui` | The term lookup also works in `design-preview` pages, where the server refuses it (no session, preview port) | So the popover can be checked in the browser. The `lab-ui` mockups keep their own canned version. |

Verified: `tsc`, `next build`, 80 unit tests, `test:db:lab` (8 checks) and `test:db:terms` (3 checks) on local Postgres, live runs of the grader, the Tutor and a lookup, and every screen in the browser preview at desktop and phone width. Not yet verified signed in on production.

## Not part of this

- A roadmap graph. The Course outline answers "where am I in the whole course" for now; the graph stays in v1 section 8.
- A dark theme for Ken OS.
- Writing the content for the unwritten topics. The outline only names them.

## After the first live test (2026-10-03)

The owner tested term lookup on production. What changed:

- **`E` was unreliable.** It re-read the page's selection at the moment the key was pressed, which can come back empty. It now acts on the selection the Explain button is showing, and listens at the window level.
- **Hover state** on the Explain button, plus a tooltip naming the shortcut.
- **Loading is visible:** a spinner, two placeholder lines, and "You can close this: the lookup keeps going".
- **Lookups are background jobs.** A browser-side job store (`features/terms/lookup-jobs.ts`) keeps a lookup running when the popover closes or you move to another Ken OS page; if nothing is watching when it finishes, a notification shows the meaning with Save to Terms. The server stores every answer the moment it arrives (`ken_term_lookups.term_key` and `answer`, migration 0008), so the same term within 30 days is answered instantly, without an AI call or counting toward the limit, even after a reload. No server queue was needed, since a lookup takes seconds.
- **App-wide notifications:** `components/ui/toaster.tsx` (`toast()` plus one `<Toaster />` in the workspace shell), recorded as a design-system component rule. The lab's inline "saved" messages, Course and Terms now use it; errors about a specific action stay next to that action.
- **Code in question text:** a practice question showed raw ```` ```js ```` code. Question text now renders as Markdown, and the Tutor (`tutor-v4`) and Assessor (`assessor-v3`) are told to keep code out of it.
