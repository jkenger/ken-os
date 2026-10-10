# Engineering rebuild

Status: approved by the owner, 10 Oct 2026. Built the same day in 8 stacked PRs (section 9); `points.yaml` and `roles.yaml` re-approved the same day. Waiting on: a walk through the hosted app.

## Decision

Engineering restarts from the owner's reference prototype and drops everything the prototype doesn't have. The current build has too much to learn and too much to assess, and its progress model (proven, placement checks, not assessed, known, needs another look, checkpoints, chapter screening) is more than the owner wants to manage.

The reference: `C:\Users\johnk\Downloads\Ken-OS-Engineering-Design\ken-engineering` (`src/App.jsx`, `UX-HANDOFF.md`). It is the source of truth for **flow, page layout and learning content**. Every screen and journey in it is integrated, except the ones this document removes.

Two things are not copied word for word:

- **Look.** The reference uses Inter, indigo and Tabler icons. Ken OS uses shadcn's Nova default (design system 2.0.0, see `docs/architecture/design-system-shadcn-setup.md`): build every screen from the registry components as shipped, with no Ken OS-only tokens. Look changes start in the design system, never in a code PR.
- **Copy.** The reference has small labels above headings and taglines under them. Screens follow [app-language.md](../product/app-language.md): same structure, app-language wording. This document gives the wording.

This supersedes `engineering-redesign.md`, `engineering-assessment-v2.md`, `engineering-lab-profile.md` and the Engineering slices (3, 4, 5) of `docs/product/app-language-rewrite.md`. Keep those files as history; don't build from them.

## Owner decisions (10 Oct 2026)

| Question | Decision |
|---|---|
| Assessment length | 5 questions, one per area, as in the reference |
| "From your projects" section | Left out until Ken OS can really detect concepts in projects |
| Topic states | Four: Not started, Learning, Practicing, Proven |
| Existing progress | Start fresh. Old answers, attempts, proofs and lessons are deleted |
| The 7 new topics | Included now, with assessment points and an exercise each |
| Removed topics | Deleted, not archived |

## 1. Curriculum

5 areas, 13 chapters, 40 topics. Areas keep today's ids (`foundations`, `frontend`, `backend`, `production`, `ai`). Kept topics keep their ids so saved source packets still match. Merged and new topics get new ids.

`content/engineering-lab/curriculum/topics.yaml` is rewritten to exactly this list. The `books` and `modules` sections become `areas` and `chapters`.

### Foundations

| Chapter id | Chapter | Topic id | Topic | From today | Exercise |
|---|---|---|---|---|---|
| `js-runtime` | JavaScript runtime & async | `js.call_stack` | Call stack | `js.call_stack` | new `call-stack-block` |
| | | `js.promises` | Promises | `js.promises` | `event-loop-order` (shared) |
| | | `js.event_loop` | Event loop | `js.event_loop` | `event-loop-order` |
| | | `js.closures` | Closures | `js.closures` | `closure-loop` |
| `http-browser` | HTTP & the browser | `web.http_semantics` | HTTP semantics | `web.request_lifecycle`, narrowed to methods, status codes and headers | `request-anatomy` |
| | | `web.cookies_cors` | Cookies & CORS | merge of `web.cookies_sessions` and `web.cors` | `cors-rules` |
| | | `web.http_caching` | HTTP caching | `web.http_caching` | `cache-rules` |

### Frontend

| Chapter id | Chapter | Topic id | Topic | From today | Exercise |
|---|---|---|---|---|---|
| `react` | React | `react.render_model` | State & rendering | `react.render_model` | `todo-updates` |
| | | `react.effects` | Effects & dependencies | `react.effects` | `chat-connection` |
| | | `react.component_boundaries` | Component boundaries | **new** | new `component-split` |

### Backend & Data

| Chapter id | Chapter | Topic id | Topic | From today | Exercise |
|---|---|---|---|---|---|
| `api-boundaries` | API boundaries | `api.runtime_validation` | Runtime validation | `api.runtime_validation` | `order-input` |
| | | `sec.resource_authorization` | Authorization | `sec.resource_authorization` (moved from Testing & security) | `team-docs` |
| | | `api.error_contracts` | Error contracts | **new** | new `error-shape` |
| `databases` | Databases | `db.transactions` | Transactions | `db.transactions` | `transfer-rollback` |
| | | `db.composite_indexes` | Composite indexes | merge of `db.indexes` and `db.composite_indexes` | `order-history-index` |
| | | `db.concurrency` | Concurrency | merge of `db.lost_update` and `db.atomic_updates` | `stock-race` |

### Production

| Chapter id | Chapter | Topic id | Topic | From today | Exercise |
|---|---|---|---|---|---|
| `testing-security` | Testing & security | `test.strategy` | Test boundaries | `test.strategy` | `discount-tests` |
| | | `sec.injection` | Injection prevention | `sec.xss`, widened to SQL injection | `comment-render` |
| | | `sec.sessions` | Session security | **new** | `cookie-rules` |
| `reliability` | Reliability | `rel.background_jobs` | Background jobs | `rel.background_jobs` | `job-queue` |
| | | `rel.retry_backoff` | Retry & backoff | `rel.retry_backoff` | `retry-policy` (see §4) |
| | | `rel.timeouts` | Timeouts | `rel.timeouts` | `request-timeout` |
| | | `rel.partial_failures` | Partial failures | `rel.partial_failures` | `order-saga` |
| `observability` | Observability | `obs.logs` | Structured logs | `obs.logs` | `structured-logs` |
| | | `obs.traces` | Tracing | `obs.traces` | `trace-context` |
| | | `obs.metrics` | Metrics | `obs.metrics` | `latency-summary` |
| `architecture` | Architecture at scale | `arch.failure_tradeoffs` | Failure tradeoffs | **new** | `circuit-breaker` |
| | | `arch.service_boundaries` | Service boundaries | **new** | new `service-split` |

### Applied AI

| Chapter id | Chapter | Topic id | Topic | From today | Exercise |
|---|---|---|---|---|---|
| `retrieval` | Retrieval | `ai.semantic_search` | Embeddings | `ai.semantic_search` | `vector-search` |
| | | `ai.chunking` | Chunking | **new** | new `chunk-boundaries` |
| | | `ai.advanced_rag` | Hybrid search | `ai.advanced_rag` | `rank-fusion` |
| | | `ai.retrieval_eval` | RAG evaluation | `ai.retrieval_eval` | `retrieval-metrics` |
| `model-interfaces` | Model interfaces | `ai.structured_outputs` | Structured outputs | `ai.structured_outputs` | `invoice-extract` |
| | | `ai.tool_calling` | Tool calling | `ai.tool_calling` | `tool-loop` |
| `agents` | Agents | `ai.agent_patterns` | Agent loop | `ai.agent_patterns` | `support-workflow` |
| | | `ai.agent_memory` | State & memory | `ai.agent_memory` | `chat-memory` |
| | | `ai.mcp` | MCP | `ai.mcp` | `mcp-server` |
| `ai-production` | AI in production | `ai.evals` | Evals | `ai.evals` | `eval-gate` |
| | | `ai.model_routing` | Model routing | **new** | `smart-routing` |
| | | `ai.cost_latency` | Cost & latency | `ai.cost_latency` | `context-budget` |

Topic titles on screen are the short reference names in the "Topic" column. The long titles in today's YAML go.

### Deleted topics (16)

`js.references_mutation`, `js.async_races`, `db.constraints`, `db.query_plans`, `api.pagination`, `api.idempotency_basics`, `rel.graceful_degradation`, `arch.caching`, `arch.evolution`, `arch.multi_tenancy`, `arch.scaling`, `ai.rag`, `ai.reranking`, `ai.context_engineering`, `ai.observability`, `ai.production_reliability`.

Merged-away ids are also deleted: `web.request_lifecycle`, `web.cookies_sessions`, `web.cors`, `db.indexes`, `db.lost_update`, `db.atomic_updates`, `sec.xss`.

Delete their entries in `topics.yaml` and `points.yaml`, and their source packets under `content/engineering-lab/sources/`. The "never overwrite a source packet" rule still holds for kept topics.

### Labs

- **Kept and relinked (34):** every lab in the Exercise column above. Update each `lab.yaml` `topics:` list to the new topic id. `event-loop-order` lists both `js.event_loop` and `js.promises`.
- **New (5):** `call-stack-block`, `component-split`, `error-shape`, `service-split`, `chunk-boundaries`. Each follows the lab rules: the starter fails at least one test, the solution passes, `pnpm test` checks both.
- **Deleted (14):** `email-lookup`, `shallow-copy`, `search-race`, `unique-signup`, `feed-pages`, `idempotent-payment`, `read-through-cache`, `expand-contract`, `tenant-keys`, `load-shedding`, `rag-prompt`, `rerank-budget`, `llm-trace`, `provider-fallback`.

Every topic has exactly one exercise (39 labs; `event-loop-order` serves two topics). Run `pnpm --filter @ken-os/web lab:generate` after the YAML and lab changes.

### Assessment points

`points.yaml` keeps 4 to 6 points per topic and stays the source for proof questions and rubrics.

- Kept topics keep their points. Merged topics combine and trim their points to 6 at most.
- The 7 new topics need new points. Claude drafts them in the curriculum slice. They are a draft (`status: draft`) until the owner approves them and sets `reviewedOn`.
- Because this changes the file, the whole file returns to `status: draft` until the owner re-approves it.

## 2. Topic states

Four states, stored per topic in `lab_progress`, replacing today's five statuses plus the screening and placement flags.

| State | Set when |
|---|---|
| Not started | Default |
| Learning | The lesson is opened |
| Practicing | The exercise is run at least once |
| Proven | The proof answer passes its rubric, after the exercise has passed |

Rules:

- Reading a lesson or passing the exercise never makes a topic Proven.
- Proven never goes back. If a review in Practice goes badly, the topic stays Proven and simply comes back in Practice sooner.
- A proof only counts if the exercise passed without opening the solution. Opening the solution is allowed; the exercise must then be passed again from the starter before Prove opens. (This replaces today's solution-reveal record.)

Gone from the screen and the code: Known, Not assessed, Needs another look, placement check, screening, checkpoint, chapter screens, "estimate".

## 3. Screens and flow

Routes stay under `features/engineering-lab/routes.ts`. Old `/lab` redirects stay.

```
Overview ─ Start assessment ─► Intake ─► Assessment (5 questions) ─► Results ─► Direction ─► Profile
Profile / Learn ─► Topic: Learn ─► Exercise ─► Prove (Proven)
Overview / Practice ─► 4 reviews ─► Summary
```

### Shell

Module tabs: **Overview, Profile, Learn, Practice.** The AI-uses badge stays in the module bar.

### Overview (`/engineering`)

| Part | Before the first assessment | After it |
|---|---|---|
| Main card | Title "Assessment", state "Not started" or "In progress · 2 of 5", button **Start assessment** or **Resume assessment**, helper "5 questions · no timer" | Next topic: title is the topic name, meta "Area · Chapter" and its state, button **Continue** |
| Practice card | Hidden | "Practice", state "4 ready" or "Done", button **Start practice** or **View summary**, helper "~12 min" |
| Your path | The 5 areas, each with its summary line; a row opens Learn filtered to that area | Same, with each area's evidence level |
| Relevant changes | Radar items, or the empty state "No changes yet / Checked weekly from official docs" with **View radar** | Same |

"From your projects" is left out.

### Intake (`/engineering/profile/assessment`, first step)

Back link: Overview. Title "Intake". A single form, no Guide chat:

| Field | Type | Helper |
|---|---|---|
| What you're building | Text area | |
| Role you're aiming for | Select, the 4 roles | Change it after the assessment |
| Hours per week | Number, 1–40 | |

Side panel "How this works": No timer · Pause between questions · Confidence is separate from correctness · Intake isn't graded.

Button **Continue to assessment** (off until the text and hours are valid). Saves to `lab_profile`.

### Assessment

The 5 fixed questions below, in order. Bar: **Save & exit** (back to Overview), "Question N of 5", **How this works** (dialog: no timer, closed-book, confidence before submitting, answers lock on submit, pause any time). A progress bar and a side list of the 5 areas with done/current marks. Side note: "Closed-book: lessons and term lookup are hidden".

Each question: area and kind label, the question, code block if any, **Answer** text area, **Confidence** 1–5 ("1 Guessing · 5 Very sure"), **Submit**. After submit the answer and confidence lock; the Assessor grades against the stored rubric and the screen shows the grade label and feedback, then **Next question** or **Finish assessment**.

If grading fails: "Couldn't grade. Your answer is saved" with **Retry** and **Save & exit**.

| # | Area | Kind | Question | Code | Rubric (pass needs all) |
|---|---|---|---|---|---|
| 1 | Foundations | Predict the output | What will this snippet print, in order? | `console.log("A");` / `Promise.resolve().then(() => console.log("B"));` / `console.log("C");` | Prints A, C, B · Says synchronous code finishes before the promise microtask runs |
| 2 | Frontend | Explain a decision | An effect fetches data whenever its dependency changes. How would you prevent an older response overwriting a newer one? | | Cancels the obsolete request or ignores its result · Uses a request identity or cleanup to tell them apart |
| 3 | Backend & Data | Debug a scenario | Two requests both see one remaining item and each complete a purchase. Where should the invariant be enforced? | | Enforces it in the database transaction · Uses an atomic conditional update or appropriate locking |
| 4 | Production | Reason about failure | A payment request times out. Is it safe to retry immediately? Explain your decision. | | A timeout doesn't prove failure · Uses an idempotency key or reconciles before repeating |
| 5 | Applied AI | Explain a decision | Your retrieval returns semantically similar but irrelevant chunks. What would you inspect before changing the LLM? | | Inspects chunk boundaries, queries or metadata filters · Measures with known relevant documents |

These live in a new `content/engineering-lab/curriculum/assessment.yaml`, with `status: approved` and `reviewedOn: "2026-10-10"` (the owner chose this set by choosing the reference).

Grades use today's labels: Solid, Partly there, Rusty, Misconception, Gap. Question 1 is graded by comparing the output first, then the Assessor checks the reason.

Pause and resume: the run resumes at the next unanswered question. Every taken assessment is a new history row; the first never changes. A retake uses the same 5 questions.

### Results (`/engineering/profile/assessment/[runId]/results`)

Title "Assessment complete". Three counts: Areas assessed (5), Answers (5), Solid answers (N). A list of the 5 questions with grade and confidence. Button **Choose direction**; link **View evidence**.

### Direction (`/engineering/profile/direction`)

Back link: Profile. Title "Direction". Fields: **Target role** (select, 4 roles), the role's one-line summary, **Required depth** per area (Aware, Can build it, Can run it; areas the role doesn't need are hidden), **Hours per week**. Link **Levels and depth** opens a dialog with the level definitions (Junior, Mid, Senior from `roles.yaml`) and the depth ladder, plus "Overall level is capped by the weakest required area". Button **Save direction**, then toast "Direction saved". Saving never changes evidence.

### Profile (`/engineering/profile`)

Title "Profile". Header facts: **Target role** (opens Direction) and **Last assessed** (date).

Capability table, one row per area: Capability (name and summary), Evidence level (rail Junior · Mid · Senior, or "Developing"), Target (the role's level), Proof coverage (proven required topics / required topics for the target). Expanding a row lists that area's remaining required topics, each with its state, linking to the topic.

Side panel "Next milestone": the area and level closest to done, e.g. "Production · Mid", with **Continue learning** (next missing topic) and **Take assessment** or **Resume assessment**.

"Assessment history": one row per assessment (date, "Assessment", "5 answers"), **View evidence** opens the evidence page with each question, answer, confidence, grade, feedback, rubric and assessor version.

Before any assessment: the table shows every area as "Developing" with 0 coverage, and the main action is **Start assessment**. No made-up levels.

### Learn (`/engineering/learn`)

Title "Learn". Toggle **My path / All topics**, search "Search topics". Chapters as disclosures grouped by area, each showing "N / M proven". Topic rows: state icon, topic name, state word. My path shows only chapters the target role needs, weakest area first (from the assessment grades), then course order. Side panel "Next": the next topic with **Continue topic**.

Empty search: "No topics found" with **Clear search**.

### Topic (`/engineering/learn/[topicId]`)

Back link: Learn. Meta "Area · Chapter". Title is the topic name with its state badge. Link **Evidence & sources** (dialog: sources with checked date, and this topic's attempts and proof). Three steps: **Learn, Exercise, Prove**; Exercise shows a check once passed; Prove is off until the exercise passes.

**Learn.** If no lesson exists yet: "No lesson yet" / "Written from trusted sources · ~1 min" / **Write lesson**. The lesson has these parts, in order:

1. A short heading and two or three sentences on the core idea
2. **Mental model** callout
3. One formula, code or rule block
4. A product example
5. **Go deeper** (optional, folded)
6. Side panel **What you'll prove** (3 bullets from the topic's points) and **Sources**

Button **Try the exercise**. Opening the lesson sets the topic to Learning.

**Exercise.** File name and runner note ("Browser · 2 s limit" or "Postgres in the page"), the task in one line, the editor, **Run tests**, **Reset code**, **Hint** (dialog). Results panel: before a run "Run your code to see results"; while running "Running…"; on error the message; otherwise "N / M tests passed" with each test's actual and expected value. On a pass: **Continue to proof**. Never advances on its own.

**Prove.** Prompt written by the Assessor from the topic's points, **Your reasoning** text area (30 characters or more), **Confidence**, a line "Exercise: passed" or "Exercise: still required", **Submit proof**. The Assessor grades against the rubric; the result lists each rubric line as met or missed. Pass sets Proven and shows "Topic proven" with **Back to profile** and the next topic. A miss shows what's missing and **Try again**.

### Practice (`/engineering/practice`)

Title "Practice". A stable daily set of 4 items: reviews due first, then proven topics whose source changed, then misconceptions from graded answers, then the topic in progress. Each item: "Review N of 4", a title, the question, **Answer**, **Confidence**, **Check**. Feedback is graded against the topic's points and shows the reference answer. **Next review** or **Finish practice**; **Save & exit** in the side panel.

Summary: "Practice done · 4 answers". The next review date for each topic comes from its grade. No streaks, points or penalties. Lab fixes are no longer part of Practice.

Before any proven topic, Practice draws from topics in Learning or Practicing.

### Radar

Unchanged in behavior: weekly, official sources, at most 5 items, never graded. A changed source for a proven topic puts that topic into Practice; it does not change its state.

## 4. Retry & backoff, the reference topic

Hand-written from the reference, stored as the lesson for `rel.retry_backoff` so it never needs generating. Every other lesson is generated by the Tutor in this format.

**Learn**

- Heading: A timeout is an uncertain outcome
- Body: A dependency may have completed the work even though you never got its response. Before retrying, decide whether repeating the operation can cause harm.
- Mental model: Retry only when repeating is safe. Space attempts out, add jitter so clients don't retry in sync, cap the delay, and stop after a bounded number of attempts.
- Block: `delay = min(1000 × 2 ** attempt, 30000)`. For attempts 0, 1 and 2 that's 1, 2 and 4 seconds; the ceiling keeps waits bounded. In a real client, add jitter.
- Product example: retrying a read is usually simple; retrying a payment is not. For writes, an idempotency key lets the server recognize the same operation.
- Go deeper, what changes with jitter: full jitter picks a delay between zero and the exponential cap. It spreads clients out but doesn't make an unsafe write safe.
- What you'll prove: Implement a bounded delay policy · Explain an uncertain write outcome · Choose a safe retry strategy
- Source: AWS Builders' Library, "Timeouts, retries and backoff with jitter" (https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

**Exercise** (`labs/retry-policy`, replaced to match)

- File `retry-policy.js`, starter `function retryDelay(attempt) { return 1000; }` (labs load as plain scripts, so no `export`)
- Task: Return exponential delays starting at 1000 ms, capped at 30000 ms. Attempts start at zero.
- Tests: attempt 0 → 1000, 1 → 2000, 2 → 4000, 8 → 30000. Browser worker, 2 s limit.
- Hint: Use `2 ** attempt` to grow the delay, multiply by the first delay, cap with `Math.min`.

**Prove**

- Prompt: The payment timed out. What now? A payment provider may have accepted the request before the connection timed out. Explain how you would retry safely, and how you'd avoid a retry storm.
- Rubric: Uses an idempotency key or reconciles the earlier request · Caps attempts and exponential delays · Adds jitter to spread concurrent retries

## 5. Profile rules

- **Evidence level per area** comes only from Proven topics, using the level-to-chapter-and-depth mapping in `roles.yaml`. An area with no level met is "Developing".
- **The assessment never sets a level.** It orders My path (weakest area first) and is kept as history and evidence.
- **Proof coverage** is proven required topics divided by required topics for the target level in that area.
- **Overall level** is capped by the weakest required area.

`roles.yaml` changes:

- Keep 4 roles: AI product engineer, Full-stack engineer, Frontend developer, Full-stack developer with applied AI. Delete `fullstack-developer`.
- Remap each area's level lists to the 13 new chapter ids.
- Since the file is approved, this is a reviewed commit: `status` returns to draft until the owner re-approves and moves `approvedOn`.

## 6. Data

Start fresh. The owner's progress is deleted, not migrated.

- **Delete rows** (one migration): `lab_assessment_runs`, `lab_assessments`, `lab_chapter_screens`, `lab_attempts`, `lab_solution_reveals`, `lab_progress`, `lab_progress_changes`, `lab_daily_sets`, `lab_lessons`, and the intake and direction fields in `lab_profile`. Keep `lab_source_packets` for kept topics and `lab_radar_items`.
- **Schema follows the deploy rule:** add new columns first; drop `lab_chapter_screens`, `lab_progress_changes`, `lab_solution_reveals` and unused columns in a later release once nothing reads them.
- **Progress status values** shrink to `NOT_STARTED`, `LEARNING`, `PRACTICING`, `PROVEN`. Rename or map `VALIDATED` to `PROVEN` and delete `NEEDS_REVISIT` in code.
- **AI-use limit and its reset** are unchanged.

### As built (slice 2, migration `0010_engineering_rebuild.sql`)

The old tables were shaped around topic-by-topic placement, so the new flow got its own tables instead of reusing them. Old ones are emptied by the same migration and dropped later.

| Table | Holds |
|---|---|
| `lab_runs` | One assessment, with its 5 questions copied in so a taken assessment never changes |
| `lab_run_answers` | One locked answer per question; the grade fills in afterwards and stays empty while grading has failed |
| `lab_questions` | Proof prompts and practice questions the Assessor wrote, with rubric and reference answer |
| `lab_topic_events` | Lesson opened, exercise run, solution opened, proof, review. Topic state is rebuilt from these |
| `lab_progress` | A cache of the rebuilt state; never the source of truth |
| `lab_profile` | Intake, target role, and a new `weekly_hours` column |

Kept as they were: `lab_source_packets`, `lab_lessons`, `lab_daily_sets`, `lab_radar_items`. Emptied now, dropped in a later release: `lab_assessment_runs`, `lab_assessments`, `lab_attempts`, `lab_chapter_screens`, `lab_solution_reveals`, `lab_progress_changes`, and `lab_profile.conversation` and `added_chapters`.

## 7. Removed from the build

Delete the code, routes, prompts and tests for:

- The Guide chat intake and direction talk (`/api/lab/profile/guide`, `guide-chat.tsx`), and Guide-suggested chapters
- Adaptive assessment, chapter screening and screens for added chapters (`/api/lab/screens`, `/api/lab/screens/added`, `/api/lab/runs/[id]/chapters/[chapterId]`)
- Placement checks
- Checkpoints as a separate journey
- The topic steps Practice and Check, and lesson practice predictions
- Lab fixes inside daily practice
- "Not assessed", "Known", "Needs another look", "estimate"
- The pre-redesign `components/lab/` screens and `app/lab/` pages, except the redirects

Kept: Researcher (source packets), Tutor (lessons), Assessor (grading, proof prompts), the browser and Postgres runners, radar, term lookup, the AI-use limit, routes and redirects.

## 8. Copy changes in the word list

Update `docs/product/app-language.md`:

- **Assessment** is the only test name. Baseline, Checkpoint, Placement check and Intro are removed. The first assessment is just the first row in history.
- **Intake** replaces Intro: the 3-field form before the assessment.
- **Topic steps** are Learn, Exercise, Prove.
- **Topic states** are Not started, Learning, Practicing, Proven.
- **Developing** replaces "Not yet junior".
- The Guide is removed.
- The Engineering rows in `app-language-rewrite.md` (slices 3, 4, 5) are superseded by this document.

## 9. Implementation slices

One branch and one PR per slice, cut from up-to-date `main`. Each slice runs `pnpm test`, `pnpm check` and `pnpm build` and opens every touched screen locally.

| # | Branch | Covers |
|---|---|---|
| 1 | `feat/engineering-curriculum` | `topics.yaml`, `points.yaml` (drafts for the 7 new topics), `assessment.yaml`, `roles.yaml` remap, labs relinked, deleted and added, source packets for deleted topics removed, `lab:generate` |
| 2 | `feat/engineering-reset` | Data reset migration, four states, removed engine code (§7), status rename |
| 3 | `feat/engineering-assessment` | Intake, 5-question assessment, results, direction |
| 4 | `feat/engineering-topic` | Topic page with Learn, Exercise, Prove; lesson format; Retry & backoff content; proof grading |
| 5 | `feat/engineering-profile` | Profile rules (§5), Profile page, evidence page |
| 6 | `feat/engineering-overview-learn` | Overview and Learn pages |
| 7 | `feat/engineering-practice` | Practice selection and screen |
| 8 | `docs/engineering-rebuild-done` | Word list update, AGENTS.md and architecture docs pointed here, old docs marked superseded |

Slices 1 and 2 go first. Owner approval of `points.yaml` and `roles.yaml` is needed before slice 5 ships.

### As built (10 Oct 2026)

All 8 slices are built as stacked PRs, each on the one before: jkenger/ken-os#49 (curriculum, with this spec), #50 (reset), #52 (assessment), #53 (topic), #54 (profile), #55 (overview and learn), #56 (practice) and the docs slice. Merge them in order. While only some are merged, Engineering pages that aren't built yet are missing, so merge the stack together.

Decisions made while building, within the spec:

- **Predict question.** Question 1 has an Output field (one printed line each) next to Answer, so the printed lines can be compared in code before the Assessor reads the reason. The grade is the weaker of the two.
- **Answers save without the AI.** Submitting an assessment answer never waits on an AI check; if grading fails the answer stays saved with Retry.
- **Show solution.** Allowed any time behind a confirm. It resets the editor to the starter and closes Prove until the exercise passes again.
- **Shared exercise.** A run of `event-loop-order` counts for both Promises and Event loop, and so does opening its solution.
- **Lab starters are plain scripts,** so the Retry & backoff starter has no `export` (section 4).
- **Lesson sources** are the packet sources the lesson cites; a hand-written lesson carries its own, checked on the date in its file.
- **Practice questions** are written when the day's set is made (up to 4 AI uses) and stay the same all day.
- **Retired words** (Known, Not assessed, Needs another look, Placement check, Checkpoint, Baseline, Estimate, Guide, Not yet junior) are on the app-language banned list, so they can't come back on a screen.

## 10. Done when

1. The curriculum is exactly the 13 chapters and 40 topics above; every topic has one exercise whose starter fails and solution passes.
2. A fresh owner can go Overview → Intake → 5 questions → Results → Direction → Profile, pausing and resuming between questions.
3. Retry & backoff works end to end: lesson, exercise passing 4 / 4, proof graded by the Assessor, topic Proven, Profile coverage updated.
4. Any other topic writes its lesson on demand and follows the same three steps.
5. Practice serves 4 items, records grades and sets next review dates.
6. No screen shows Known, Not assessed, Needs another look, placement check, checkpoint, screening, estimate or the Guide.
7. All copy passes the app-language check.
8. The owner has walked the flow on the hosted app. A local build isn't proof of the hosted result.

## Open questions

- **Retakes** use the same 5 questions. If they feel stale, a later change can rotate questions per area.
- **Points for the 7 new topics** and the **roles remap** wait on owner review (slice 1 drafts them).
