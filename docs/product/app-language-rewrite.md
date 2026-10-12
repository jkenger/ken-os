# App language rewrite plan

Status: implemented 3 Oct 2026, in nine slice PRs and a final cleanup. Written for a separate implementation session.

This plan applies [app-language.md](app-language.md) to every live screen. That file owns the rule and the word list; this file lists every change, file by file, and the order to ship them in. Read `app-language.md` first.

## Ground rules for the implementer

- **One branch and one PR per slice**, cut from up-to-date `main`, named as listed below. Slices are independent after slice 1.
- **Change words, not behavior.** No new features, no data or API shape changes. Layout changes only where removing a label, tagline or paragraph requires it.
- **Line numbers are hints** from `main` at `f8fa26e`. Find the string, not the line.
- **"Now → After" is the target, not a suggestion.** Where a row says "remove", delete the element. Where the right wording needs a value the plan can't know (a size limit, a count), read it from the code.
- **Small all-caps labels:** write source text in sentence case and keep the visual caps with the existing class, so the text stays readable to screen readers and search. Remove the label entirely where this plan says so.
- **Ellipsis:** use `…` (one character), never `...`.
- **Contractions** throughout: "Couldn't", "Isn't", "Doesn't".
- **Error shape:** what failed, then what to do. "Couldn't save. Try again". No trailing period on one-line UI text; full stops only between two parts of one message.
- **Leave alone:**
  - Content: lesson text and its section names, worked examples, Go deeper, answer feedback, AI-written explanations, resume assistant answers, term explanations, and the Guide's AI replies.
  - Scripted Guide openers stay as speech, but follow the word list (see slice 3).
  - Code identifiers, database values, route paths, and API field names.
  - Agent-facing Project Memory API errors (capture key, idempotency, evidence validation in `features/project-memory/contract.ts` and `store.ts` lines ~237–254). Agents read those, not the owner.
  - Developer-only messages that never reach production, such as the `OWNER_EMAIL` setup hint.
  - Preview pages (`app/design-preview`, `components/lab-ui-preview`, `components/writing-studio-preview.tsx`, `components/project-memory-preview.tsx`), except the one stale line in slice 9.
- **Verify each slice:** `pnpm test`, `pnpm check`, `pnpm build`, then open every touched screen locally and read it. Report what was checked in the PR.

## Slices

| # | Branch | Covers |
|---|---|---|
| 1 | `test/app-language-check` | Automated check with a shrinking allowlist, shared error strings |
| 2 | `fix/app-language-shell-resume` | Shell, signed-out page, Resume, resume and auth errors |
| 3 | `fix/app-language-lab-home` | Lab Today, Profile, Guide chat, profile charts, Lab summary card |
| 4 | `fix/app-language-lab-assessment` | Baseline and checkpoint screens |
| 5 | `fix/app-language-lab-topics` | Course list, topic page, answers, feedback, labs, practice, Lab errors |
| 6 | `fix/app-language-skills` | Skills page and skills errors |
| 7 | `fix/app-language-terms` | Terms page, term lookup, terms errors |
| 8 | `fix/app-language-memory` | Project Memory screen and owner-facing errors |
| 9 | `fix/app-language-design-system` | Design System page, examples, generated skill, stale preview line, empty the allowlist |

---

## Slice 1: automated check

New test `apps/web/src/lib/app-language.test.ts`, picked up by the existing `src/lib/*.test.ts` glob in `pnpm test`.

**How it reads copy:** parse every `.tsx` under `apps/web/src` with `@babel/parser` (add as a dev dependency of `@ken-os/web`; it's already in the lockfile as a transitive dependency). Collect JSX text, string literals and template literals, skipping `className` and other non-text attributes. Also scan string literals in `src/app/api/**` and `src/features/*/api.ts`.

**Excluded paths:** `*.test.*`, `components/ui/`, the four preview files listed above, `features/engineering-lab/preview.ts`, and the agent-facing Project Memory files.

**Fails on:**

1. An em dash (U+2014) anywhere in collected text.
2. A banned phrase from `apps/web/src/lib/app-language-banned.ts`. Start the list with:
   `Ready when you are`, `Pick up where you left off`, `Hi.` (outside Guide openers), `resume agent`, `Resume hub`, `Agent skills`, `AGENT CAPABILITIES`, `Could not`, `Request failed`, `Invalid origin`, `Sign in required`, `OWNER_EMAIL` (outside the dev-only route), `screening`, `receipt` (screen text only), `...` (three dots).
3. An `<h1>`, `<h2>` or `<h3>` whose static text ends in a period.

**Allowlist:** `app-language-allowlist.ts` holds `file + text` pairs that fail today, generated once in this slice. The test fails on any violation not in the list, and on any list entry that no longer occurs, so each later slice must delete its entries. Slice 9 ends with an empty list.

**Shared error strings:** add `apps/web/src/lib/messages.ts` with the repeated server errors, and use it in every route and `features/*/api.ts` helper:

| Now | After |
|---|---|
| Invalid origin. | Couldn't verify the request. Reload the page |
| Sign in required. | Signed out. Sign in again |
| Invalid JSON. | Couldn't read the request. Reload the page |

---

## Slice 2: shell, signed-out page, Resume

The Resume rows below are superseded: on 12 Oct 2026 Resume became Profile and the Resume assistant was removed ([profile-resume.md](profile-resume.md)).

### `components/workspace-shell.tsx`

| Now | After |
|---|---|
| Resume hub (nav group and item, ~15, ~32) | Resume |
| Agent skills (~16, ~40) | Skills |
| Design system (~17, ~63) | Design System |
| Writing studio (~24, ~73) | Writing Studio |
| Handoff brief (~46, ~94) | Handoff |
| Saved terms (~74) | Terms |
| Jump to a module... | Jump to a module… |
| Find a module... | Find a module… |
| No matching module. | No matches |
| Personal space (above the email, ~289) | remove; keep the email |

### `app/page.tsx` (signed out)

This is the one marketing page, so one tagline may stay.

| Now | After |
|---|---|
| Your work, in one place (small label) | remove |
| A home for the things you keep coming back to. | keep |
| Ken OS starts with your resume. Select it once from Google Drive, then keep its latest version within reach. | Your resume, Engineering Lab and the tools around them, in one private workspace. |
| Private access for the configured owner. | Owner only |
| Right panel: KEN OS · 01 / RESUME · PRIMARY RESUME · Your latest work, ready when you are. · One selected source file. Always connected to its current version. · CONNECTED TO GOOGLE DRIVE | Show real labels instead: "Resume", "Google Drive · Connected", "Engineering Lab", "Today's practice · ~15 min". No sentences. |

### `app/page.tsx` (signed in, passes errors to Resume)

| Now | After |
|---|---|
| This file is in the trash. Choose another resume. | In Drive trash. Choose another file |
| Could not reach Google Drive. | Couldn't reach Google Drive. Refresh to try again |

### `components/resume-workspace.tsx`

| Now | After |
|---|---|
| YOUR DOCUMENTS (label) | remove |
| Resume hub. (h1, with a styled period) | Resume (no period span) |
| One place for your current resume, always connected to its source. | remove |
| 01 / MODULE | remove |
| ENGINEERING LAB (Lab summary card label) | Engineering Lab |
| PRIMARY RESUME · GOOGLE DRIVE SOURCE (row above the card) | remove |
| CONNECTED | Connected |
| This file stays in Google Drive. Changes to it appear here when you refresh. | Edits in Drive show after Refresh |
| NEEDS ATTENTION / NOT SELECTED | Needs attention / Not chosen |
| Choose your resume (empty title) | No resume yet |
| Pick the file you want to keep as your current resume. | Choose a Google Doc, PDF or Word file from Drive |
| Select from Drive / Replace resume | Choose resume / Choose another |
| Download latest | Download |
| YOUR RESUME PREVIEW / Select a file to see it here. | No preview / Choose a resume to preview it |
| SOURCE FILE | Source file |
| HOW IT WORKS (label) + "One selected file. Always current." (h3) | How it works (h3), no label |
| Ken OS remembers the exact Drive file you chose. Edits to that file are available here; choosing a new copy is always your decision. | Shows the Drive file you chose. Never switches files on its own |
| RESUME ASSISTANT (label) + "Ask about your resume." (h3) | Resume assistant (h3), no label |
| Add an OpenAI API key to enable the assistant. | Not set up |
| The assistant currently works with Google Docs resumes. | Works with Google Docs only |
| Enabled during this answer: | Skills on for this answer: |
| Could not select file. (×2) | Couldn't save your choice. Try again |
| Google Picker is not configured yet. | Drive picker isn't set up |
| Google Picker is still loading. Try again shortly. | Drive picker is loading. Try again in a moment |
| Could not connect to Google Drive. | Couldn't connect to Google Drive. Reconnect Google |
| Google Picker could not load. | Drive picker didn't load. Reload the page |
| Could not open Google Picker. | Couldn't open the Drive picker. Try again |
| Could not answer. (×2) | Couldn't answer. Try again |

### `features/engineering-lab/profile-store.ts` → `labSummary` (Lab card on Resume)

| Now | After |
|---|---|
| Take your baseline to start your profile | Baseline · Not started |
| Your baseline is in progress | Baseline · In progress |
| Open the lab | Open |
| Pick a direction for your profile | No direction yet |
| Today's practice is done / is waiting / not started | Today's practice · Done / Ready / Not started |

### Resume, Drive and sign-in errors

| File | Now | After |
|---|---|---|
| `api/auth/google/callback` | This sign-in link is no longer valid. Start again from /api/auth/google. | Sign-in expired. Sign in again |
| | Missing Google access token. | Google didn't finish sign-in. Sign in again |
| | Google Drive file access was not granted. | Drive access wasn't allowed. Sign in again and allow it |
| | Could not verify Google account. | Couldn't verify your Google account. Sign in again |
| | This Google account does not match OWNER_EMAIL. | This Google account doesn't have access |
| | Google did not grant offline access. Please sign in again. | Google didn't keep you signed in. Sign in again |
| `api/auth/google` | Set OWNER_EMAIL in apps/web/.env… | keep in development; in production return "Sign-in isn't set up" |
| `api/resume/ask` | Select a resume first. | Choose a resume first |
| | The assistant currently supports Google Docs resumes. | Works with Google Docs only |
| | Ask a question between 2 and 2000 characters. | Questions must be 2–2,000 characters |
| | The assistant is not configured yet. | Resume assistant isn't set up |
| | The assistant could not answer right now. | Couldn't answer. Try again |
| `api/resume/content` | Select a resume first. | Choose a resume first |
| | The selected file is in the trash. | In Drive trash. Choose another file |
| `api/resume` | Invalid Drive file ID. | Couldn't open that file. Choose it again |
| | That file is in the trash. | In Drive trash. Choose another file |
| | Select a Google Doc, PDF, or DOCX file. | Choose a Google Doc, PDF or Word file |
| `lib/google.ts` | Invalid stored token. | Google sign-in is broken. Reconnect Google |
| | Google Drive is not connected. | Google Drive isn't connected. Reconnect Google |
| | Google authorization expired. Please sign in again. | Google sign-in expired. Reconnect Google |
| | Google did not return an access token. | Google didn't respond. Reconnect Google |

---

## Slice 3: Lab home and profile

> **Superseded on 10 Oct 2026** by [engineering-rebuild.md](../architecture/engineering-rebuild.md), which gives the Engineering wording. These screens no longer exist.

### `components/lab/lab-today.tsx`

| Now | After |
|---|---|
| ENGINEERING LAB · TODAY (label) | remove |
| Pick up where you left off. / Start with where you are. (h1) | Today |
| WRITTEN TOPICS PROVEN | Proven, with the count (e.g. 4 of 21) |
| Fix a prerequisite first / Start next | Prerequisite first / Up next |
| ALL CAUGHT UP / Every written topic is known or proven, and nothing is due for review. New chapters come next. | All caught up / Nothing due. New chapters coming |
| BASELINE IN PROGRESS / START HERE | Baseline · In progress / Baseline · Not started |
| Finish your baseline. / Find out where you are first. | remove (the label already says Baseline) |
| The three numbered steps (short talk, closed-book assessment, profile) with a paragraph each | One helper line: "Intro (~5 min), then up to ~54 questions. Pause between chapters". Move the three steps, one line each, behind a "How this works" toggle |
| Continue the baseline / Start the assessment / Start the talk | Continue baseline / Start baseline / Start intro |
| TODAY'S PRACTICE · ABOUT 15 MINUTES | Today's practice · ~15 min |
| A short mixed set from what you have learned, so it stays fresh. | remove |
| A warm-up from topics in progress, until your first topic is proven. | Warm-up until your first topic is proven |
| Done for today. | Done |
| `N of M questions answered, plus one hands-on fix` | `N of M answered · 1 lab fix` |
| Review it | Review answers |
| THIS WEEK ON YOUR RADAR / All radar items | Radar / All |
| The radar starts once you pick a direction. | Starts after you choose a direction |
| Nothing flagged this week. | Nothing flagged |
| This week's scan has not run yet. | Not scanned this week |
| Re-check it | Re-check |
| Your profile | Profile |
| Change direction / Pick a direction | Choose direction |
| The role and level definitions are a draft you have not approved yet. + Read them | Role definitions · Draft + Review |
| WHERE YOU ARE | Where you are |
| HOW FAR FROM EACH ROLE | Roles |
| WHERE YOU'RE HEADING | Roadmap |
| Pick a direction and the roadmap draws the chapters it needs, in order, with a pace estimate. + Talk it through | No direction yet / Choose one to see the chapters it needs + Ask the Guide |
| REVIEWS DUE · | Reviews due · |
| Nothing else due. | Nothing else due |
| OPEN MISCONCEPTIONS / No open misconceptions. | Misconceptions / None open |
| RECENT CHANGES / No progress changes yet. | Recent changes / No changes yet |
| Your baseline from DATE is the starting point. / Your baseline will be the starting point. | Starting point: baseline, DATE / Starting point: baseline |
| AI use today: | AI uses today · (show "N of LIMIT") |

### `components/lab/profile/lab-profile.tsx`

| Now | After |
|---|---|
| ENGINEERING LAB · PROFILE (label) | remove; h1 is Profile |
| What do you want to become? | Direction |
| A direction, not a lock. Change it whenever your goals change; your baseline stays where it is and the roadmap redraws. | Change any time. The baseline stays |
| Your shape comes from the baseline, so the direction talk comes after it. | Available after the baseline |
| Continue the baseline / Start the baseline | Continue baseline / Start baseline |
| Pick a direction | Choose direction |
| Talk it through with the Guide. It only uses your real numbers, and it suggests rather than decides: you confirm every change here. | The Guide suggests; you confirm every change |
| Guide opener: "Here's your shape from the baseline. Tell me what you want to build…" | Keep as speech, replace "your shape" with "where you are" |
| THE GUIDE SUGGESTS | Guide's suggestion |
| "N chapters away. You're …" (fragment) | N chapters away |
| Make it my direction / Direction set | Set as direction / Direction set |
| SUGGESTED NEW CHAPTER | Suggested chapter |
| Add it / No thanks / Chapter added, unwritten | Add chapter / Dismiss / Added · Not written yet |
| OR CHOOSE YOURSELF | All roles |
| All there | Ready |
| Your direction / Direction set (heading) | Current direction |
| Chapters you added: They join the outline unwritten. Each gets two short screening questions of its own, so the roadmap knows where you start. Your baseline never moves. | Chapters you added: Not written yet. Each starts with a placement check |
| Not assessed yet | Not assessed |
| Assess this chapter | Placement check |
| Writing questions... | Writing questions… |
| Your radar + the weekly-scan paragraph | Radar + helper "Weekly scan of official docs and release notes · up to 5 items". Re-check rule goes behind "How this works" |
| Scanned this week (WEEK) / Scan this week | Scanned · WEEK / Scan now |
| Pick a direction first. | Choose a direction first |
| Re-check it | Re-check |
| Nothing on the radar right now. | Nothing flagged |
| How this was assessed + "Every question, answer and grade is saved, with the prompt versions and model, so any level here can be checked." | Assessment history + "Every question, answer and grade" |
| finished DATE | Finished DATE |
| Continue your checkpoint / Take a checkpoint | Continue checkpoint / Start checkpoint |
| What the levels and roles mean | Levels and roles |
| These definitions are a draft that you haven't approved yet. Read them before trusting a level. | Draft · not approved |
| Approved on DATE. | Approved DATE |
| That didn't work | Couldn't save. Try again |

### `components/lab/profile/pictures.tsx`

| Now | After |
|---|---|
| `LEVEL (estimate). N of M chapters done toward LEVEL.` | `LEVEL (estimate) · N of M chapters to LEVEL` |
| At the baseline: X. / Your direction needs Y. / Your direction doesn't need this area. | Baseline: X / Direction needs: Y / Not needed for direction |
| Estimate from screening only | Estimate from placement check |
| At your baseline / Your direction's target | Baseline / Direction target |
| YOUR DIRECTION | Direction |
| Shares N of its missing chapters with your direction. | N chapters shared with direction |
| Nothing left for your direction. Pick a further one, or take a checkpoint. | Direction complete + actions Choose direction, Start checkpoint |
| `…, and about N hours per topic from your own history. An estimate; it moves as you go.` | `~N h per topic, from your history · estimate` |
| · a chapter you added | · added by you |

### `components/lab/profile/guide-chat.tsx`

| Now | After |
|---|---|
| THE GUIDE | Guide |
| The Guide is thinking... | Thinking… |
| Your message (label) | Message |
| Write as you would say it. (placeholder) | Message the Guide |
| Ctrl+Enter sends. Each reply uses one of today's AI generations. | Ctrl+Enter to send · 1 AI use per reply |
| The Guide could not answer. | Guide couldn't answer. Try again |

---

## Slice 4: Lab assessment (`components/lab/assessment/lab-assessment.tsx`)

> **Superseded on 10 Oct 2026** by [engineering-rebuild.md](../architecture/engineering-rebuild.md), which gives the Engineering wording. These screens no longer exist.

| Now | After |
|---|---|
| ENGINEERING LAB · (label) | remove |
| Ready when you are. / First, a short talk. | Title Baseline or Checkpoint, state Intro or Not started |
| Your baseline. / Your checkpoint. | Baseline / Checkpoint |
| Closed-book, one chapter at a time. | Closed-book · one chapter at a time |
| Guide opener "Hi. Before the questions, tell me…" | keep (scripted speech) |
| The rules paragraph and list (how chapters work, lessons closed, no timer, grades after chapter, pause) | A "How this works" toggle, open before the first start, with one line each: "One question per written topic, a follow-up if needed" · "Chapters without lessons: placement check, 2 questions" · "Proven topics skipped" · "Lessons and term lookup locked until done" · "No timer · rate confidence before each answer" · "Grades shown after each chapter" · "Pause between chapters" |
| Start a checkpoint / Start the baseline | Start checkpoint / Start baseline |
| WHAT THE INTAKE SAVES + "The Guide fills this in as you talk. Check it, change anything, then save. It only steers where questions start; it never counts as evidence." | From your intro + "Edit anything. Steers where questions start; never graded" |
| For example: my own web products, a SaaS for clinics. (placeholder) | e.g. my own web products, a SaaS for clinics |
| Hours a week for the lab | Hours per week |
| Not asked, already known: | Skipped as known: |
| This chapter has no lessons yet, so these answers only estimate how deep you go. They never prove a topic. | No lessons yet · estimate only, never proves a topic |
| Every question and answer | All answers |
| YOU RATED N OF 5 | Confidence N of 5 |
| Thrown out | Discarded |
| `TOPIC · QUESTION N OF UP TO M` | `TOPIC · Question N of up to M` |
| Baseline finished / Checkpoint finished + Your profile is ready on the lab home. | keep titles + "Profile updated" |
| Finished on DATE · This is your starting point and it never changes. · Your profile shows it next to your baseline. | Finished DATE · "Baseline · never changes" or "Shown next to the baseline" |
| See your profile / Pick a direction | Open profile / Choose direction |
| CHAPTERS DONE | Chapters done |
| AI calls used: | AI uses: |
| `N topics to ask about, M skipped as already known.` | `N topics · M skipped as known` |
| No lessons yet, so two short screening questions estimate how deep you go. | No lessons yet · placement check, 2 questions |
| `N topic's/topics' questions still need writing.` | `N topics need questions` |
| Writing questions... / Write the missing questions / Start this chapter | Writing questions… / Write questions / Start chapter |
| Could not save. / Could not start. / Could not write the questions. | Couldn't save. Try again / Couldn't start. Try again / Couldn't write questions. Try again |

---

## Slice 5: Lab course, topic, practice

> **Superseded on 10 Oct 2026** by [engineering-rebuild.md](../architecture/engineering-rebuild.md), which gives the Engineering wording. These screens no longer exist.

### `components/lab/lab-topics.tsx`

| Now | After |
|---|---|
| ENGINEERING LAB · COURSE / The whole course, in order. | Course |
| My gaps only | Gaps only |
| Showing only gaps: topics that the baseline, a placement check or a proof hasn't shown you know. Topics nobody has assessed yet stay, with a placement check. | Topics not yet shown as known, including unassessed ones |
| Known · skip | Known |
| Not assessed yet | Not assessed |
| Waiting on prerequisites | Needs prerequisites |
| No gaps here: everything written is known or proven. | No gaps |
| Writing questions... | Writing questions… |
| Could not write the placement check | Couldn't write the placement check. Try again |

### `components/lab/lab-topic.tsx`

| Now | After |
|---|---|
| Practice comes from the lesson. Write the lesson first. + Go to Learn | Write the lesson first + Go to Learn |
| This lesson has no practice. | No practice in this lesson |
| For learning. Predictions are checked by running the code; only the Check step and labs can prove the topic. | Not graded · only Check and Lab prove a topic |
| Show the answer | Show answer |
| What's been shown so far | Evidence |
| Baseline on DATE: LABEL. / Not assessed in the baseline. | Baseline · DATE · LABEL / Baseline · not assessed |
| Average confidence N of 5. | Confidence · N of 5 |
| You were sure about an answer that turned out to be a misconception. | Confident misconception |
| Next review DATE. | Next review · DATE |
| Every answer ( | All answers ( |
| Lesson saved. / New questions ready. | Lesson saved / Questions ready |
| Could not write the lesson / Could not write questions | Couldn't write the lesson. Try again / Couldn't write questions. Try again |
| Researching and writing, about a minute... | Writing lesson… ~1 min |
| Write the lesson / Write a new version | Write lesson / Rewrite lesson |
| Closed while your assessment is open. + paragraph about staying closed | Locked during assessment + "Lesson, practice and labs open when it's done" |
| Back to the assessment | Back to assessment |
| No lesson yet. + "The Researcher gathers trusted sources first, then the Tutor writes a lesson aimed at your gap. It takes about a minute." | No lesson yet + "Written from trusted sources for your gap · ~1 min" |
| The baseline rated this solid, so you can skip it. | Baseline: Solid · safe to skip |
| Your predictions are checked against real requests your browser makes now. Every answer right counts as proof. | Checked against real requests from your browser · all right proves the topic |
| Code runs in your browser, cut off from your Ken OS session. A full pass counts as proof unless you looked at the solution first. | Runs in your browser, isolated from Ken OS · a full pass proves the topic unless you opened the solution |
| Database labs load a small Postgres (PGlite) into the page the first time, which takes a few seconds. | First database lab takes a few seconds to load |
| Prove it with fresh questions | Check |
| Get new questions / Get questions | New questions / Get questions |
| Written by a separate assessor that hasn't seen the lesson. Predictions are checked by running the code. | Questions from a separate grader that hasn't seen the lesson |
| No questions yet. Get a set when you're ready; each question is graded as you answer it. | No questions yet + "Graded as you answer" |

### `components/lab/topic/answers.tsx`

| Now | After |
|---|---|
| How sure are you, before answering? + "This doesn't change your grade. It flags answers you were sure about but got wrong, since those beliefs are the hardest to notice." | Confidence + "Not graded. Flags sure-but-wrong answers" |
| What it prints, one line per log | Predicted output · one line per log |
| Optional and not graded. Compare it with the explanation after you check. | Optional · not graded |
| Your answer (label, ×2) | Answer |
| Your why: | Why: |
| Pick how sure you are first. | Choose confidence first |
| Answer saved. / Answer graded. / Practice checked. | Answer saved / Graded / Checked |
| Could not submit. / Could not check. | Couldn't submit. Try again / Couldn't check. Try again |
| Submit answer | Submit |
| Check by running it | Run to check |
| Thrown out | Discarded |

### `components/lab/topic/feedback.tsx`

| Now | After |
|---|---|
| Real output against yours | Actual vs. predicted |
| The code printed nothing, and you predicted nothing. | No output, as predicted |
| Every line, in order. | All lines, in order |
| TOPIC PROVEN + "Every part shown, N of them by running code. First review DATE, to make sure it stays." | Topic proven + "All parts shown · N by code · first review DATE" |

### `components/lab/topic/labs.tsx`

| Now | After |
|---|---|
| Every test passes. / Close. Fix the failing ones below. / Nothing passes yet. | All tests pass / N failing / All failing |
| Run saved. You've seen this lab's solution, so it no longer counts as proof. | Saved · doesn't count as proof (solution opened) |
| Run saved. / Check saved. | Saved |
| Could not run the tests. / The check could not run. / Could not load the solution. | Couldn't run tests. Try again / Couldn't run the check. Try again / Couldn't load the solution. Try again |
| Confirm: "After you see the solution, passing this lab won't count as proof. Show it?" | "Show solution? Passing won't count as proof." |
| Solution shown. (toast) | remove |
| Go to the code | Back to code |
| Tab indents. Press Escape, then Tab, to move on from the editor. | Tab indents · Esc then Tab to leave |
| Show solution again | Show solution |
| This check isn't available in this build. | Check unavailable |
| PREDICT, THEN CHECK | Predict, then check |
| Running real requests... / Run the check / Answer every question first | Running… / Run check / Answer all first |

### `components/lab/topic/learn.tsx`

Section names (Why it matters, The gap, Mental model…) are lesson content and stay.

| Now | After |
|---|---|
| Optional. Open what you're curious about. | Optional |
| Write these up in Obsidian in your own words. | Write up in Obsidian, in your own words |

### `components/lab/practice/lab-practice.tsx`

| Now | After |
|---|---|
| ENGINEERING LAB · TODAY'S PRACTICE | remove; h1 is Today's practice |
| Done for today. / Fifteen minutes, mixed. | Done / ~15 min |
| Items mix topics on purpose: switching is what makes recall stick. Answers count as reviews, so a solid one pushes a review further out and a slip brings a topic back. No streaks; missing a day costs nothing. | "Mixed topics · answers count as reviews". The rest goes behind "How this works" |
| Writing today's set... / Write today's set | Writing… / Start practice |
| A warm-up from topics in progress, until your first topic is proven. | Warm-up until your first topic is proven |
| · HANDS-ON FIX · | Lab fix |
| Start again from the starter code and make the tests pass, without opening the solution. | From the starter code, without the solution |
| Open the lab | Open lab |
| Could not write today's set. | Couldn't write today's practice. Try again |

### Lab errors

| File | Now | After |
|---|---|---|
| `features/engineering-lab/api.ts` | The AI roles are not configured yet. | Engineering Lab AI isn't set up |
| | The AI step failed. Nothing was saved; try again. | AI step failed. Nothing saved. Try again |
| `features/engineering-lab/store.ts` | Today's limit of N AI generations is used up. It resets at midnight UTC. | Out of AI uses for today (N). Resets at midnight UTC |
| | The grader is not configured yet. | Grader isn't set up |
| `store.ts`, `assessment-run.ts`, `profile-store.ts` | Assessment / Question / Question set / Lesson / Radar item not found. | X not found. Reload the page |

---

## Slice 6: Skills

### `components/skills-workspace.tsx`

| Now | After |
|---|---|
| AGENT CAPABILITIES (label) | remove; h1 is Skills |
| Upload reusable instructions, review them, then enable a version for the resume assistant. | remove (empty state explains it) |
| / MODULE | remove |

### `components/skill-manager.tsx`

| Now | After |
|---|---|
| ADD A SKILL / Upload instructions. | Add skill |
| Use a standalone SKILL.md, or a ZIP with SKILL.md and Markdown files under references/ | SKILL.md, or a ZIP with SKILL.md and references/*.md |
| Upload skill | Add skill |
| Uploads are private and disabled by default. Do not include credentials. Scripts, binary assets, and external tool permissions are not supported. | Off until you turn it on. Markdown only: no scripts, binaries or credentials |
| `NAME saved. Review it below before enabling.` | `Added NAME · Off` |
| Upload failed. (fallback) | Upload failed. Try again |
| YOUR SKILLS | remove label; show count next to the list ("3 skills") |
| No skills yet. + "Upload a resume-related skill to guide the current assistant. The hosted MVP skill can be uploaded to test the library, but it is not relevant to resume questions." | No skills yet + "Markdown instructions the resume assistant can follow" + Add skill |
| Review & export | Files and export |
| This is a copy of the stored source; it does not change which version is enabled. | Doesn't change which version is on |
| Enable for resume agent / (disable action) | Turn on / Turn off |
| `NAME vN enabled.` / `disabled.` | `NAME vN on` / `off` |
| Could not update skill. | Couldn't update. Try again |
| `Copied NAME vN SKILL.md.` | Copied SKILL.md |
| Could not copy. Download SKILL.md instead. | Couldn't copy. Download SKILL.md instead |

### Skills errors

| File | Now | After |
|---|---|---|
| `api/skills` | Upload is too large. | Upload failed. Max size is LIMIT (read from code) |
| | Choose SKILL.md or a ZIP bundle. | Choose a SKILL.md or ZIP file |
| | Could not save this skill. | Couldn't add this skill. Try again |
| `api/skills/[id]`, `[id]/export` | Invalid skill ID. / Skill version not found. | Skill not found. Reload the page |
| | Could not export this skill. | Couldn't export. Try again |

`Expected enabled: true or false.` and `Unsupported export format.` are developer errors and stay. Validation messages from `lib/skill-bundle.ts` stay unless they contain a banned phrase.

---

## Slice 7: Terms

### `components/terms/terms-page.tsx`

| Now | After |
|---|---|
| KEN OS · TERMS (label) | remove |
| Words you looked up. (h1) | Terms |
| Select any word on a Ken OS page and press Explain, or E, to look it up without leaving the page. Saved terms land here with a link back to where you found them. | remove (empty state covers it) |
| Search your terms (label and placeholder) | Search terms |
| No saved term matches “X” | No matches for “X” |
| No saved terms yet. + Try it on a lesson… select a word like “microtask”, press Explain, then Save to Terms. | No terms yet + "Select text on any page and press E" |
| Could not remove it. / Could not remove it | Couldn't remove. Try again |
| Removed "X" from Terms | Removed "X" |

### `components/terms/term-lookup.tsx`

| Now | After |
|---|---|
| Looking it up on trusted sites | Looking up… |
| Usually about 5 seconds. You can close this: the lookup keeps going, and the answer pops up when it's ready. | ~5 s · keeps going if you close this |
| No trusted page found for this one. | No trusted source found |
| Couldn't save the term (×2) | Couldn't save. Try again |
| Couldn't look up "X" | Couldn't look up "X". Try again |

### Terms errors

| File | Now | After |
|---|---|---|
| `features/terms/api.ts`, `lookup-jobs.ts` | The lookup failed. Try again. / The lookup failed. | Lookup failed. Try again |
| `features/terms/store.ts` | Term lookup is not configured yet. | Term lookup isn't set up |
| | Term not found. | Term not found. Reload the page |

---

## Slice 8: Project Memory (`components/memory-workspace.tsx`)

Screen word changes: receipt → **work log**, proposed → **draft**, capture key → **agent key**. API routes and stored values keep their names.

| Now | After |
|---|---|
| PROJECT MEMORY / KEN OS PILOT · POLICY V (labels) | remove; h1 is Project Memory |
| Pick up where you left off. + "A source-linked handoff from reviewed decisions and work receipts" (with an em dash) "not a transcript warehouse." | remove both |
| Handoff copied. / Could not copy handoff. | Handoff copied / Couldn't copy. Try again |
| CURRENT STATE / Approved handoff | Handoff |
| Only items you approved appear as confirmed context for a future agent. | Approved items only |
| Nothing approved yet. Capture a decision or receipt, then review its evidence below. | Nothing approved yet + "Approve a decision or work log below" |
| No verification recorded. | Not verified |
| REVIEW INBOX / Proposed decisions | Draft decisions |
| REVIEW INBOX / Work receipts | Draft work logs |
| No decisions waiting for review. / No receipts waiting for review. | No drafts |
| Correct this draft / Save correction | Edit draft / Save |
| No external source attached · review the claim before approval. | No source · check before approving |
| Capture and policy | New entry |
| Record as work happens. / A draft is not confirmed memory until you review it. | remove / "Saved as a draft" |
| Source reference (optional) / Evidence reference (optional) | Source (optional) / Evidence (optional) |
| Save proposed decision / Save proposed receipt | Save draft |
| New work receipt | New work log |
| OPEN ITEMS / Still to resolve / No open items in approved receipts yet. | Open items / None open |
| Personal-project boundary / This pilot accepts only Ken OS. Work/client project content is excluded. | Ken OS only · no work or client content |
| View capture rules and digest | Capture rules |
| AGENT CAPTURE / Use a scoped key. | Agent key |
| Create one key for the Ken OS capture command. It can read this project's context and submit drafts, but cannot approve them. | Lets an agent read approved context and send drafts. It can't approve |
| Create / rotate key | Create key, or Replace key when one exists |
| Copy now (em dash) shown only once | Copy now. Shown once |
| New capture key created. Any previous key was revoked. Copy it now; it will not be shown again. | Agent key created. Old key revoked. Copy it now |
| Capture key revoked. / Capture key copied. | Agent key revoked / Key copied |
| Decision saved as proposed. Review it below before it enters the handoff. | Decision saved as draft |
| Receipt saved as proposed. Review it below before it enters the handoff. | Work log saved as draft |
| `Decision/Receipt approved/rejected.` | `Decision/Work log approved/rejected` |
| Correction saved with a revision. It remains proposed until approved. | Correction saved · still a draft |
| Request failed. / Could not save decision. / Could not save receipt. / Could not save correction. | Couldn't save. Try again |
| Could not review item. | Couldn't save the review. Try again |
| Could not create key. / Could not revoke key. / Could not copy key. | Couldn't create key. Try again / Couldn't revoke. Try again / Couldn't copy. Try again |
| Copied handoff text: "Proposed, not confirmed: N decisions and N receipts." | "Drafts not yet approved: N decisions, N work logs" |

The copied handoff is read by an agent but pasted by the owner, so it follows the word list and has no em dashes. Keep its structure.

### Owner-facing memory errors

| File | Now | After |
|---|---|---|
| `features/project-memory/api.ts` | Could not complete the memory request. | Couldn't save. Try again |
| `api/memory/review` | Invalid review request. / Invalid item kind. / Invalid item ID. / Invalid review action. | Couldn't save the review. Reload the page |
| `api/memory/credentials` | Invalid revoke request. / Invalid key ID. | Couldn't revoke. Reload the page |

---

## Slice 9: Design System, generated skill, cleanup

### `components/design-system-workspace.tsx`

| Now | After |
|---|---|
| DESIGN SYSTEM (label) | remove |
| Design, made repeatable. (h1) | Design System |
| The visual language behind Ken OS, shown through the real pieces we use (em dash) and packaged to try in another personal project. | Ken OS tokens and components, exportable as a skill |
| Export requires owner sign-in. / Owner sign-in required for export. | Sign in to export |
| Download working skill / Download working ZIP | Download skill / Download ZIP |
| 01 / FOUNDATIONS + Quiet by design. | Foundations (no tagline) |
| Semantic color, a two-font hierarchy, and density that keeps important work easy to scan. | Color, type and density |
| 02 / COMPONENTS + The pieces we actually use. | Components |
| These examples import the same buttons, cards and input as the app. Try the primary action and field; keyboard focus works here too. | Same components as the app. Keyboard focus works |
| 03 / APPLIED PATTERNS + Density follows the work. | Patterns |
| Repeated information stays compact; high-stakes tasks receive space. These are different uses of one language, not separate themes. | Compact for repeated items, roomy for tasks |
| Resume hub / Agent skills | Resume / Skills |
| Roomy source-file and document-viewing task. / Compact library items and a clear management action. / Decision cards in a development-only mockup. | Roomy task view / Compact list / Decision cards (mockup) |
| 04 / DECISIONS + Why it looks this way. | Decisions |
| A new rule starts in the development preview, enters the real component and contract after your choice, and becomes approved only after gallery review. | New rules start in the preview, move into components once chosen, and are approved after review |
| 05 / PORTABLE SKILL + Try the system somewhere new. | Export |
| The ZIP contains SKILL.md and Markdown references. It is a working preset, not an approved release; it does not install itself or change another project's dependencies. | SKILL.md and Markdown references · working preset, not approved · doesn't install anything |

Type specimen lines ("Manrope makes a point.", "Source Sans 3 carries the explanation…") are samples and stay.

### `features/design-system/examples.tsx`

| Now | After |
|---|---|
| 01 / ACTIONS, 02 / INPUT, 03 / REPEATED ITEM, 04 / TASK SURFACE, 05 / SURFACE EXPLORATION | Actions, Input, Repeated item, Task surface, Surface exploration |
| Shared primitive (×4) | remove |
| One strong action, with quieter choices nearby. | One primary action, quieter secondary ones |
| The sample action completed. Select it again to reset. / Select the primary action to see its feedback state. | Done · select again to reset / Select to see feedback |
| The stock shadcn Card surface and slots, at Ken OS's compact content density. | Compact card for lists |
| The same default Card can contain a roomier task surface. | Same card, roomier spacing |
| A task surface can reuse Card without introducing a custom density variant. | remove |
| A low-contrast ivory-to-stone gradient that adds depth without turning the card into a dark accent. | Low-contrast ivory-to-stone gradient |
| More context in, better answers out. | Git, docs and conversations |
| Visual preview only. Connections are not configured here. | Preview only · not connected |
| We can promote the gradient to a named surface token after reviewing it here. | remove (record in `docs/design/component-language.md` instead) |

### `features/design-system/skill.ts`

The generated reference titles for Foundations and Components put an em dash between the title and its subtitle. Replace with a colon, then run `pnpm --filter @ken-os/web design:generate` and commit the regenerated `.agents/skills/ken-os-design/` files. Don't hand-edit the snapshot.

### Cleanup

- `app/design-preview/page.tsx` ~96: "Project Memory is not implemented yet." → remove the line (Project Memory ships).
- `app-language-allowlist.ts` is empty; delete the file and its import so new violations always fail.
- In `app-language.md`, change Status to "Implemented" with the date.

---

## Done when

1. All nine slices are merged.
2. `pnpm test` passes with no allowlist.
3. Every acceptance criterion in [app-language.md](app-language.md) holds.
4. The owner has opened each module on the hosted app and signed off. A passing local build is not proof of the hosted result.
