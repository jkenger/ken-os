# Engineering with Claude: mockup brief

Status: proposed, 12 Oct 2026. The UI half of [engineering-claude-connector.md](engineering-claude-connector.md). Mockups are made in the Ken OS design system in Claude (look changes start there); this brief says which frames, states and words to draw. Code follows the chosen mockups.

## Ground rules for every frame

- **Look:** the design system as it is (2.0.0, shadcn's Nova default). Build from its live components (`window.KenOS`: Button, Badge, Card, Tabs, Dialog, Alert-style Notice, Tooltip and the rest). Anything that needs a new token or a new component is named as a build-on-top proposal, not slipped in.
- **Words:** app language. Names, actions and states, no sentences in the frame, no taglines, no em dashes, no emoji. Copy below is final unless a frame shows it doesn't fit.
- **Sizes:** each frame at desktop (1440 wide) and phone (390 wide). Light theme.
- **Claude's own screens aren't ours to design.** Where a frame needs to show the conversation side, draw a plain, unbranded chat window labelled "Claude (illustrative)". Never copy claude.ai's look or logo.
- **Honesty is visible.** Wherever Claude has touched something, the screen says so in a word or a badge. Wherever grading happens, the screen makes clear Ken OS does it.

## Frames

### A. Topic page: Ask Claude and autosave

Today's topic page: `PageHeading` (area · chapter, the topic name, a state badge, **Evidence & sources** on the right), then **Learn / Exercise / Prove** tabs.

| Frame | What's new                                                                                                                                                | Copy                                          |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A1    | **Ask Claude** button at the right end of the step tabs row (outline, small, a chat icon at the start). On a phone it moves under the heading, full width | Ask Claude                                    |
| A2    | Pressed: a toast, and a new tab opens (show the toast only)                                                                                               | Toast title "Copied. Paste it in Claude"      |
| A3    | Exercise step: an autosave status next to the editor's file name, in muted text                                                                           | "Saving…" / "Saved" / "Couldn't save · Retry" |

### B. Topic page: exercises from Claude

| Frame | State                                                                                                                | Copy                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1    | A new exercise version has arrived while the owner is on an older one they've already run. A notice above the editor | Title "New exercise from Claude", line "Switching starts a fresh attempt", buttons **Switch** and **Not now**                                                              |
| B2    | A new version before the owner has run anything: it simply shows. The editor's meta line names the source            | "From Claude · v3" (repo labs show nothing)                                                                                                                                |
| B3    | Checking a new version in the browser before showing it. A skeleton editor with a status line                        | "Checking exercise…"                                                                                                                                                       |
| B4    | The new version failed its check. A destructive notice; the previous version stays in the editor                     | Title "This exercise doesn't check out", line naming what failed, e.g. "The solution fails 1 of 4 tests", then "Using v2". No button; Claude sees it through the connector |
| B5    | No exercise yet for the topic (rare: every topic has a repo lab today)                                               | Empty state "No exercise yet" / "Ask Claude to write one", button **Ask Claude**. Ken OS has no built-in exercise writer                                                   |

### C. Topic page: lesson and proof

| Frame | State                                                                                                            | Copy                                           |
| ----- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| C1    | A lesson written by Claude: the meta line under the lesson heading                                               | "From Claude · Oct 12"                         |
| C2    | Prove step: one helper line under the prompt, so grading's owner is clear                                        | "Graded in Ken OS against this topic's points" |
| C3    | Prove step with a question Claude wrote: the points it tests are listed under the prompt as small outline badges | Point titles, shortened                        |

### D. Connect Claude (consent page)

Shown at `/oauth/authorize` when the owner adds the connector in claude.ai. Same frame as the sign-in page: a centered Card, nothing else.

| Frame | State                  | Copy                                                                                                                                                                                                                                                                                         |
| ----- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1    | Default                | Wordmark "Ken OS"; title "Connect Claude"; a "Can" list with two lines, "Read your Engineering progress and code" and "Save lessons, exercises and proof questions"; a "Can't" list with one line, "Grade answers or mark topics proven"; buttons **Allow** (default) and **Deny** (outline) |
| D2    | Bad or expired request | Destructive notice "This connection link isn't valid" / "Add the connector again in Claude". No buttons                                                                                                                                                                                      |
| D3    | Signed out             | Not a frame: the sign-in page appears first, then D1                                                                                                                                                                                                                                         |

Show "Can" and "Can't" as two short lists with icons (check and cross) plus the words. Colour never carries the meaning on its own.

### E. Profile: Connections

A new Card at the bottom of the Engineering Profile page.

| Frame | State                        | Copy                                                                                                                                |
| ----- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| E1    | Connected                    | Card title "Connections"; a row: "Claude", "Connected Oct 12 · Last used 2 min ago", and **Disconnect** (ghost, destructive text)   |
| E2    | Disconnect pressed: a dialog | Title "Disconnect Claude?", line "Claude loses access until you connect again", buttons **Cancel** and **Disconnect** (destructive) |
| E3    | None                         | Empty state "No connections" / "Add Ken OS as a connector in Claude"                                                                |

### F. Storyboard (illustrative)

One wide frame, desktop only: "Claude (illustrative)" on the left with a short teaching exchange about Retry & backoff, and the Ken OS topic page on the right on the Exercise step, with a failing test and the autosave "Saved". This shows the split at a glance; it's not a screen to build.

### G. Option B, on file only

One low-detail desktop frame: the topic page with a chat panel docked on the right (about 380px), the editor narrowed beside it. Labelled "Option B · not planned". Enough to judge whether it would crowd the editor, nothing more.

## Behaviour to show or annotate

- Ask Claude is hidden when the Claude Project link isn't set up. Annotate it; don't draw it.
- Autosave runs 2 seconds after typing stops. "Saved" stays until the next edit.
- "Not now" on B1 hides the notice until the next new version.
- Keyboard: every new button is reachable; the dialog in E2 traps focus and closes on Escape.
- Phone: notices and buttons stack full width; the editor keeps its full width; Ask Claude sits under the heading.

## What to deliver

1. Frames A to G as mockups in the design system, each at desktop and phone (F and G desktop only).
2. A short note listing any proposal beyond the current system: a new token, a new component (for example an Alert, if Notice isn't enough), or a changed one.
3. Drafts only. Don't bump the design system's version or change `tokens.json` until the owner picks; then record the choice in the decision log.

## Prompt for Claude Design

Paste this into Claude Design:

```
Make mockups in the Ken OS design system (https://claude.ai/artifact/RQFnaHFKvuprgmgPk6nFqj) for "Engineering with Claude".

Context
- Ken OS is a private, owner-only web app. Its Engineering module teaches one topic at a time: Learn, Exercise (a code editor with real tests) and Prove (a written answer graded in Ken OS).
- New: the owner talks a topic through with Claude in claude.ai, which connects to Ken OS. Claude can read their progress and code and save lessons, exercises and proof questions. Claude can never grade or mark a topic proven; Ken OS does.
- Read the design system's README first. Use its live components (window.KenOS). It's shadcn's Nova default (2.0.0).
- The full brief, with every frame, state and word: docs/architecture/engineering-claude-connector-mockups.md in jkenger/ken-os. Follow it exactly. The frames are summarized here.

Frames (desktop 1440 and phone 390 each, light theme)
A. Topic page: an "Ask Claude" outline button at the right of the Learn / Exercise / Prove tabs (under the heading on a phone); the toast "Copied. Paste it in Claude"; an autosave status beside the editor: "Saving…", "Saved", "Couldn't save · Retry".
B. Exercises from Claude: notice "New exercise from Claude" / "Switching starts a fresh attempt" with Switch and Not now; meta line "From Claude · v3"; "Checking exercise…" skeleton; destructive notice "This exercise doesn't check out" / "The solution fails 1 of 4 tests" / "Using v2"; empty state "No exercise yet" / "Ask Claude to write one" with Ask Claude.
C. Lesson meta "From Claude · Oct 12"; Prove helper "Graded in Ken OS against this topic's points"; the points a Claude question tests as small outline badges.
D. Consent page "Connect Claude" as a centered card: Can: "Read your Engineering progress and code", "Save lessons, exercises and proof questions"; Can't: "Grade answers or mark topics proven"; Allow and Deny. Plus the invalid-link state.
E. Profile "Connections" card: Claude row with "Connected Oct 12 · Last used 2 min ago" and Disconnect; the "Disconnect Claude?" dialog; the empty state "No connections".
F. One wide storyboard: an unbranded chat window labelled "Claude (illustrative)" beside the Ken OS topic page on the Exercise step. Never copy claude.ai's look or logo.
G. One low-detail frame of option B, a chat panel docked right of the topic page, labelled "Option B · not planned".

Rules
- App language: names, actions and states; no taglines, no narrating, no em dashes, no emoji.
- Wherever Claude made something, a word or badge says so. Wherever grading happens, it's clearly Ken OS.
- Text 4.5:1, control edges and focus 3:1. Icons always with words.
- Avoid purple-blue gradients, gradient text, glassmorphism, grain, fade-ins, badges above headlines.
- Save as drafts. Name any new token or component as a proposal. Don't change tokens.json or the version until I choose.
```
