# App language

Status: approved by the owner, 3 Oct 2026. Implemented 3 Oct 2026; `apps/web/src/lib/app-language.test.ts` enforces it.

## Decision

Ken OS screens speak in app language: names, actions and states. Full sentences belong only in content, meaning a lesson, an agent's own chat or answer, or feedback on something the owner wrote.

A copy audit on 3 Oct 2026 found the app read as "a mix of marketing and an agent talking to me". Older modules sold themselves ("Design, made repeatable."). The Engineering Lab narrated and reassured ("Ready when you are. First, a short talk."). The same feature also changed names between screens.

The references are Things for labels and Linear for empty states and settings. Both keep personality inside content. Things writes its tutorial inside to-dos. Linear keeps its AI in an "Ask Linear" corner while the rest of the app never speaks as it.

## The rule

The app is the frame. Content may talk; the frame does not.

| Layer | Shape | Example |
|---|---|---|
| Page title | One noun or short phrase. No period, no tagline. | Today |
| Section heading | One noun or short phrase | Reviews due |
| Small label above a heading | Only when it adds something the heading lacks, such as a count | Chapter 2 |
| Button | Verb and object | Run tests |
| State | A word, a count or a date | Due Oct 5 |
| Field helper | One line, no period | Not graded. Flags sure-but-wrong answers |
| Empty state | Noun, one or two lines on what it is or how to add one, one action | No terms yet / Select text on any page and press E |
| Feature explanation | In the empty state before first use, or behind a "How this works" toggle | |
| Progress | Verb in the -ing form, then the wait | Writing lesson… ~1 min |
| Success toast | Past tense, object first | Lesson saved |
| Error | What failed, then what to do. One line. | Upload failed. Files must be under 1 MB |
| Confirmation | Question title, one line on the cost, a button that repeats the verb | Show solution? / Passing won't count as proof / Show solution |

Never:

- **Sell.** The screen doesn't describe itself or its philosophy.
- **Narrate.** No "Hi", "Ready when you are", reassurance, or how the system works inline.
- **Leak internals.** No env names, component names, policy versions, model or prompt details, or raw server errors such as "Invalid origin."
- **Use em dashes.**

Allowed to speak in sentences:

- Lesson text, worked examples and Go deeper sections.
- The Guide's chat in the Lab.
- Feedback on an answer or a prediction ("Right lines, wrong order").
- Resume assistant answers and term explanations.
- The signed-out page, which is the only marketing page.

## Word list

One name per thing. Code keeps its own identifiers; this list decides what the screen says. The Lab already keeps its words in `apps/web/src/components/lab/words.ts`; every module gets the same kind of file.

### Modules

Module names are proper names in title case and appear the same in the sidebar, page title and search.

| Use | Instead of |
|---|---|
| Resume | Resume hub, Your documents, Primary resume, 01 / Resume |
| Skills | Agent skills, Agent capabilities, Skills library |
| Engineering | Engineering Lab, Lab (renamed 6 Oct 2026; code keeps `engineering-lab`) |
| Terms | Saved terms, Words you looked up |
| Project Memory | |
| Writing Studio | Writing studio |

### Resume

| Use | Meaning | Instead of |
|---|---|---|
| Resume assistant | The chat that answers questions about the resume | resume agent, current assistant |
| Choose resume | Open the Drive picker | Select from Drive, Pick the file, Replace resume |
| Refresh | Pull the latest version from Drive | Refresh resume |

### Skills

| Use | Meaning | Instead of |
|---|---|---|
| Skill | An uploaded `SKILL.md`, with or without references | instructions, capability |
| Add skill | Upload a skill | Upload instructions, Upload skill |
| On / Off | Whether the resume assistant gets it | Enable for resume agent, enabled, disabled |

### Engineering

| Use | Meaning | Instead of |
|---|---|---|
| Baseline | The first full test. Never changes. | your starting point |
| Checkpoint | A later full test, compared with the baseline | |
| Assessment | Baseline or checkpoint, when either fits | |
| Intro | The short chat before the baseline | a short talk, the talk, intake |
| Placement check | A quick check of what the owner already knows: one question per written topic, or two short questions for a chapter with no lessons yet | screening, screening questions, estimate (as a verb) |
| Overview, Profile, Learn, Practice | The four Engineering tabs. The Practice tab is titled "Today's practice" | Today, Course |
| Lesson, Predict, Lab, Prove | The four topic steps (renamed 6 Oct 2026 so "Learn" and "Practice" only name tabs) | Learn, Practice, Check (as step names) |
| Known | A topic placed by an all-solid placement check or assessment, not yet proven | Placed |
| Today's practice | The daily mixed set. Its answers on unproven topics never count as proof | daily practice, today's set, a short mixed set |
| Review | A topic coming back after a gap | |
| Direction | The role the owner is aiming at, and the page under Profile where it's chosen with the Guide | shape, what do you want to become |
| Radar | Weekly scan of docs and release notes | This week on your radar |
| AI uses | Calls to a model, with the day's limit | AI calls used, AI use today, AI generations |
| Guide | The chat that runs the intro and direction talk | |

Topic states stay as `statusWords` has them: Not started, Learning, Practicing, Proven, Needs another look. Answer grades stay as `labelWords`: Solid, Partly there, Rusty, Misconception, Gap.

The Researcher, Tutor and Assessor stop appearing by name. The screen says what is happening instead: "Writing lesson…", "Questions by a separate grader that hasn't seen the lesson". The Guide keeps its name because it talks to the owner directly.

### Project Memory

| Use | Meaning | Instead of |
|---|---|---|
| Decision | A choice and why it was made | |
| Work log | What a task did and how it was checked | receipt, work receipt |
| Draft | Not yet reviewed by the owner | proposed |
| Approve / Reject | Review actions | |
| Handoff | The text copied for the next agent session | handoff brief |
| Agent key | The scoped key an agent uses to read context and send drafts | capture key, scoped key |

The policy version leaves the screen.

### Shared

| Use | Instead of |
|---|---|
| Choose | Select, Pick (for picking one thing from a list) |
| Couldn't | Could not, That didn't work, Request failed |
| … (one character) | ... |

Contractions throughout ("Couldn't", "Isn't"), matching the Lab.

## Rewrite by screen

Order is by how far each screen is from the rule. Each row is the worst offender, not the whole screen. The complete file-by-file plan, split into PR-sized slices, is [app-language-rewrite.md](app-language-rewrite.md).

### 1. Engineering Lab Today (`components/lab/lab-today.tsx`)

| Now | After |
|---|---|
| ENGINEERING LAB · TODAY / Pick up where you left off. | Today |
| START HERE / Find out where you are first. + three numbered paragraphs | Baseline · Not started / Intro, then about 54 questions, pause between chapters / Start intro |
| REVIEWS DUE · 1 / You missed a review on Oct 1 | Reviews due · 1 / Due Oct 1 (in the warning color) |
| THIS WEEK ON YOUR RADAR | Radar |
| A short mixed set from what you have learned, so it stays fresh. | Today's practice · ~15 min |
| AI use today: | AI uses · 4 of 20 |

### 2. Engineering Lab assessment and profile (`lab-assessment.tsx`, `lab-profile.tsx`)

| Now | After |
|---|---|
| Ready when you are. / First, a short talk. | Baseline / Intro |
| Four rule sentences before the Start button | One helper line plus a "How this works" toggle holding the rules |
| What do you want to become? / A direction, not a lock… | Direction / Change it any time. The baseline stays |
| Your shape from the baseline | Where you are |
| Every question, answer and grade is saved, with the prompt versions and model… | Assessment history |
| That didn't work | Couldn't save. Try again |
| Assess this chapter / Each gets two short screening questions of its own… | Placement check |

The Guide's chat messages stay as written.

### 3. Engineering Lab topic (`lab-topic.tsx`, `topic/*.tsx`)

| Now | After |
|---|---|
| How sure are you, before answering? + two sentences | Confidence / Not graded. Flags sure-but-wrong answers |
| Closed while your assessment is open. + a paragraph | Locked during assessment / Back to assessment |
| No lesson yet. The Researcher gathers trusted sources first, then the Tutor writes… | No lesson yet / Written from trusted sources for your gap, ~1 min / Write lesson |
| Researching and writing, about a minute... | Writing lesson… ~1 min |
| Prove it with fresh questions | Check |
| This check isn't available in this build. | Check unavailable |

Answer feedback ("Right lines, wrong order…") stays as written.

### 4. Skills (`skills-workspace.tsx`, `skill-manager.tsx`)

| Now | After |
|---|---|
| AGENT CAPABILITIES / Upload reusable instructions, review them… | Skills |
| ADD A SKILL / Upload instructions. | Add skill |
| Uploads are private and disabled by default. Do not include credentials… | Off until you turn it on. No scripts, binaries or credentials |
| No skills yet. Upload a resume-related skill… The hosted MVP skill… | No skills yet / Markdown instructions the resume assistant can follow / Add skill |
| Enable for resume agent | Turn on |
| Upload failed. | Upload failed. (with the server's reason) |

### 5. Resume (`app/page.tsx`, `resume-workspace.tsx`)

| Now | After |
|---|---|
| PRIMARY RESUME / Your latest work, ready when you are. / One selected source file… | Resume / From Google Drive · updated Oct 2 |
| YOUR DOCUMENTS / Resume hub / One place for your current resume… | Resume |
| HOW IT WORKS / One selected file. Always current. | How it works (toggle) |
| RESUME ASSISTANT / Ask about your resume. | Resume assistant |
| Could not select file. / Could not answer. | Couldn't open the file. Choose it again / Couldn't answer. Try again |

Signed-out page: may keep one plain tagline, but drops "Ken OS starts with your resume" since the Lab now leads.

### 6. Project Memory (`memory-workspace.tsx`)

| Now | After |
|---|---|
| KEN OS PILOT · POLICY V3 / Pick up where you left off. / A source-linked handoff… (with an em dash) | Project Memory |
| Capture and policy / Record as work happens. | New decision, New work log (two actions) |
| AGENT CAPTURE / Use a scoped key. | Agent key |
| Copy now (em dash) shown only once | Copy now. Shown once |
| Request failed. | Couldn't save. Try again |

### 7. Terms (`terms-page.tsx`, `term-lookup.tsx`)

| Now | After |
|---|---|
| KEN OS · TERMS / Words you looked up. + paragraph | Terms |
| No saved terms yet. Try it on a lesson in the Engineering Lab: select… | No terms yet / Select text on any page and press E |
| Looking it up on trusted sites / Usually about 5 seconds. You can close this… | Looking up… ~5 s / Keeps going if you close this |

### 8. Design System and shell (`design-system-workspace.tsx`, `features/design-system/examples.tsx`, `workspace-shell.tsx`)

| Now | After |
|---|---|
| Design, made repeatable. / Quiet by design. / Density follows the work. | Design System / Foundations / Components / Patterns |
| Shared primitive, The stock shadcn Card surface and slots | Drop, or move to a developer note |
| More context in, better answers out. | Connect sources |
| Personal space (above the email) | Drop; the email is enough |

### 9. Server errors (`apps/web/src/app/api/**`)

| Now | After |
|---|---|
| This Google account does not match OWNER_EMAIL. | This account doesn't have access |
| Invalid origin. | Couldn't verify the request. Reload the page |
| Sign in required. | Signed out. Sign in again |

Developer-only messages, such as the missing `OWNER_EMAIL` setup hint, stay as they are but only appear in development.

### Out of scope for the first pass

The preview pages (`design-preview`, `lab-ui-preview`, `writing-studio-preview`, `project-memory-preview`) follow the rule when they are next touched. One fix happens now: `design-preview/page.tsx` still says "Project Memory is not implemented yet."

## Automated check

A test in `pnpm test` reads every `.tsx` file under `apps/web/src` (excluding tests and `components/ui`) and every error string returned by `apps/web/src/app/api`, using `@babel/parser` as a dev dependency.

It fails on:

- An em dash in any string.
- A phrase on a banned list kept next to the test, starting with: "Ready when you are", "Pick up where you left off", "Hi.", "resume agent", "Could not", "Request failed", "OWNER_EMAIL", "Invalid origin".
- A heading (`h1`–`h3`) whose text ends in a period.

Preview pages and content strings (lesson bodies, Guide messages, sample posts) are excluded by path.

## Acceptance criteria

1. Every live module title is one noun from the module word list, matching the sidebar.
2. No live screen has a tagline or a sentence-length heading.
3. Every term in the word list appears in only its "Use" form on screen.
4. Every user-facing error says what failed and what to do, and none shows an env name or raw server text.
5. Lesson text, Guide chat, answer feedback, assistant answers and term explanations are unchanged.
6. The automated check runs in `pnpm test` and passes.
7. `pnpm check` and `pnpm build` pass.

## Decisions

Made by the owner on 3 Oct 2026:

- The Researcher, Tutor and Assessor no longer appear by name on screen. The Guide keeps its name.
- Contractions throughout ("Couldn't", "Isn't").
- The policy version leaves the Project Memory screen.
- Screening and placement check merge into one name, **Placement check**, since both mean a quick check of what the owner already knows. Code identifiers keep their own names.
- "Writing Studio" uses title case as a proper module name.
