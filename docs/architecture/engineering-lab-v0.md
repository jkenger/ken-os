# Engineering Lab v0 architecture (proposal)

Status: **proposed, awaiting owner approval.** Three of four open questions were answered on 2026-10-01; the last one only affects Module 2. Nothing in this file is built yet except the Researcher. It answers §27 of [the handoff](../product/ai-engineering-learning-handoff.md), which stays the module's source of truth. Decisions already made are in [engineering-lab.md](engineering-lab.md).

## The short version

- **Two homes for data.** Things that are written once and reviewed (topic map, labs) live as files in the repo. Things that happen while you learn (lessons, attempts, progress) live in Postgres, because the hosted app writes them from your browser.
- **The Planner and the progress rules are plain code, not AI.** They decide what to study and whether you have proven a topic. That keeps them testable, free to run, and impossible to talk into a pass.
- **Three AI roles:** Researcher (built), Tutor and Assessor. The Tutor and Assessor are separate prompts that never see each other's exercises.
- **Proof comes from running code wherever possible.** Even the right answer to a "predict the output" question comes from actually running the snippet in your browser, not from the AI's guess.
- **No new infrastructure for Modules 1 and 2.** Vercel Sandbox is added only when Module 3's race labs need it.
- **First slice:** the event loop, end to end, on the hosted app.

## 1. Repository structure

```text
docs/product/ai-engineering-learning-handoff.md   module source of truth (unchanged)
docs/architecture/engineering-lab*.md             decisions and this proposal

content/engineering-lab/
├── curriculum/topics.yaml        topic map: prerequisites, gaps, proof required
├── learner/baseline.yaml         2026-10-01 assessment, one label per topic
└── sources/<topic>/<date>.json   Researcher packets made locally (seed data)

labs/<lab-id>/
├── lab.yaml                      topic ids, proof modes, runner type
├── README.md                     task as the learner sees it
├── starter/                      code the learner edits
├── tests/                        checks that decide pass or fail
└── solution/                     shown only after a pass or giving up

packages/domain/src/engineering-lab/   types and pure rules (no I/O)
├── topics.ts       topic map schema and loader checks
├── sources.ts      source packet rules (exists today as engineering-lab.ts)
├── mastery.ts      attempts → progress, review dates
└── planner.ts      progress + map → next topic and why

packages/agents/src/engineering-lab/   AI roles
├── researcher.ts   (exists)
├── tutor.ts
└── assessor.ts

apps/web/src/features/engineering-lab/  storage, API glue, UI pieces
apps/web/src/app/lab/                    pages
apps/web/src/app/api/lab/                API routes
```

Why: §8 asks for clear separation between curriculum, learner state, generated content, labs, results and sources. Pure rules go in `packages/domain` so they can be tested without a database or a model. This follows the existing pattern (`packages/agents` for AI, `features/` for app glue).

`labs/` sits at the repo root rather than under `content/` because each lab is a small runnable project with its own tests.

## 2. Core data model

Repo files (read at build time, validated on load):

| File | Holds | Why a file |
|---|---|---|
| `topics.yaml` | Topic map | Changes rarely, and you should review changes in a PR |
| `baseline.yaml` | The 2026-10-01 assessment | Must never change; it is the "before" picture |
| `labs/*` | Runnable exercises and their tests | Code needs version control and real test runs |

Postgres tables (Drizzle, all scoped by `user_id` like the existing tables):

| Table | One row is | Changes after insert? |
|---|---|---|
| `lab_source_packets` | One Researcher packet for one topic | Never |
| `lab_lessons` | One saved lesson version | Never |
| `lab_attempts` | One answer to one question or lab, with its grade | Never |
| `lab_progress` | Current status for one topic | Yes, recalculated from attempts |
| `lab_progress_changes` | One status change and the attempt that caused it | Never |

Why Postgres for learning data: the hosted app can't write to the repo, and you'll learn on more than one device. The handoff allows "files/database" (§26, rule 14).

Why most rows never change: an attempt or lesson that can be edited later can't serve as evidence. Progress is the only row that changes, and it can always be rebuilt from attempts.

The baseline is loaded as attempts tagged `source: baseline`, so the History page can show before and after from the same table.

## 3. Topic map schema

```yaml
- id: js.event_loop
  title: Event loop, tasks and microtasks
  track: fullstack            # fullstack | production | ai
  module: m1-js-runtime
  requires: [js.call_stack]
  freshness: web_platform     # sets how often sources are re-checked
  sourceGroups: [javascript]  # allowed domains for the Researcher
  gap: Predicted A B D C ...  # exact gap from the baseline
  depth: working              # working | deep
  prove: [predict, explain, debug]
  labs: [event-loop-order]
```

Why: a map of prerequisites instead of weeks (§9) lets the Planner redirect you to a weaker prerequisite. `prove` lists the proof each topic needs, so "proven" means the same thing every time. This replaces today's provisional `research-targets.ts`.

v0 holds only the Module 1–3 topics, about 20 in all. The handoff's full topic list (§24) comes later, one module at a time.

## 4. Progress and evidence schema

```ts
type Mode = "explain" | "predict" | "debug" | "implement" | "review" | "design";
type Label = "solid" | "partial" | "rusty" | "misconception" | "gap";
type Status = "NOT_STARTED" | "LEARNING" | "PRACTICING" | "VALIDATED" | "NEEDS_REVISIT";

interface TopicProgress {
  topicId: string;
  status: Status;
  evidence: Partial<Record<Mode, { label: Label; attemptId: string; at: string }>>;
  confidence: { averageSelfRating: number | null; overconfident: boolean };
  weaknesses: string[];        // named misconceptions still open
  lastAttemptAt: string | null;
  nextReviewAt: string | null;
}
```

Status rules, as plain code in `mastery.ts`:

- **LEARNING:** you have started a lesson or your latest answer shows a gap or misconception.
- **PRACTICING:** at least one answer was partial or better.
- **VALIDATED:** every mode in the topic's `prove` list has a latest grade of `solid` from an **assessment**, not a lesson exercise. At least one of those grades came from code (a test run or a predict check), not from the AI.
- **NEEDS_REVISIT:** the topic was validated, then a later review came back below `solid`.
- Opening or reading a lesson never changes status.

Confidence is tracked separately (§10). Before each **assessment or review** answer you rate how sure you are, from 1 to 5 (decided 2026-10-01). Lesson practice and lab runs don't ask, so learning stays quick. A rating of 4 or 5 on an answer graded `misconception` marks `overconfident`, which is exactly the pattern the baseline found.

Review timing after validation is fixed, not adaptive: 3, 10, 30, then 90 days. A passed review moves to the next gap; a failed one sets NEEDS_REVISIT. Why fixed: the handoff warns against tuning a scoring formula too early (§10, §25). Labels first, numbers later.

## 5. Source metadata schema

Already built: `SourcePacket` in `packages/domain/src/engineering-lab.ts`. It holds sources with tier and retrieval date, claims tied to a source, misconceptions, open questions, rejected items, the check date and the refresh date.

Change for v0: packets are stored in `lab_source_packets`. The local command keeps working and can also import its saved files. A lesson always points at the exact packet it was built from.

## 6. Lesson snapshot schema

```ts
interface LessonSnapshot {
  id: string;
  topicId: string;
  version: number;              // unique per topic
  sourcePacketId: string;
  promptVersion: string;        // Tutor prompt that made it
  model: string;
  createdAt: string;
  sections: {
    whyItMatters: string;
    whatYouKnow: string;        // from the baseline, so it doesn't reteach solid ground
    theGap: string;
    theory: string;             // minimum theory, Markdown
    mentalModel: string;
    workedExample: { code: string; walkthrough: string };
  };
  practice: PracticeItem[];     // prediction and short questions for the lesson itself
  labIds: string[];             // authored labs this lesson hands off to
  citations: { claim: string; sourceUrl: string }[];
  noteSuggestions: string[];    // concepts to write up in Obsidian, in your own words
}
```

Why: §13's thirteen steps are split between three owners. The Tutor writes steps 1–7. Authored labs cover steps 8–9. The Assessor covers steps 10–12. Step 13 is `noteSuggestions`. Code rejects a citation that isn't in the packet, just as the Researcher's checks do.

Why the Tutor doesn't write runnable labs in v0: a lab is only useful if its tests are right. Labs are written in the repo and reviewed like code. The Tutor links to them.

## 7. Assessment attempt schema

```ts
interface Attempt {
  id: string;
  topicId: string;
  kind: "baseline" | "lesson" | "assessment" | "review";
  mode: Mode;
  lessonId: string | null;
  item: AssessmentItem;         // the exact question as shown, stored with the attempt
  response: { text?: string; code?: string; order?: string[] };
  selfRating: 1 | 2 | 3 | 4 | 5 | null;   // required for assessment and review, null otherwise
  grade: {
    by: "code" | "assessor";
    label: Label;
    misconceptions: string[];
    feedback: string;
    run?: { passed: number; failed: number; output: string };
  };
  createdAt: string;
}
```

Why the question is stored with the attempt: the Assessor writes new questions each time (§26, rule 17), so a question has to be kept with its answer to stay checkable later.

## 8. Lab structure

```yaml
# labs/event-loop-order/lab.yaml
id: event-loop-order
topics: [js.event_loop, js.promises]
modes: [predict, debug]
runner: browser        # browser | pglite | sandbox
timeoutMs: 2000
```

Runners, cheapest first (costs are in [engineering-lab.md](engineering-lab.md)):

- **browser:** starter code and tests run in a Web Worker in your tab. Used for Modules 1 and 2. Free, and it can't reach any secrets.
- **pglite:** Postgres running inside the browser. Used for index and `EXPLAIN ANALYZE` labs in Module 3.
- **sandbox:** Vercel Sandbox with real Postgres. Used only for race labs (two buyers, one item) in Module 3.

Tests are plain TypeScript assertion files with a tiny shared harness. That keeps them runnable in a Worker, and full Vitest runs only in the sandbox. Solutions are never sent to the browser until you pass or give up.

**You write lab code in a code box on the topic page** (decided 2026-10-01). The box opens with the lab's starter code. Pressing Run sends your code and the lab's tests to the right runner: a Worker for browser labs, PGlite for index labs, or the sandbox for race labs. Step 6 decides between a plain text box and a lightweight editor with syntax highlighting. There is no local runner in v0.

## 9. AI role interfaces

```ts
// packages/domain: plain code, no AI
planNext(input: {
  map: TopicMap; progress: TopicProgress[]; recent: Attempt[]; now: Date;
}): {
  topicId: string;
  kind: "review" | "continue" | "prerequisite" | "new";
  reason: string;               // one sentence shown on Today
  depth: "working" | "deep";
  prove: Mode[];
};

// packages/agents
researchTopic(target: ResearchTarget): Promise<SourcePacket>;          // built
writeLesson(input: {
  topic: Topic; packet: SourcePacket; baseline: BaselineEntry;
  openMisconceptions: string[]; recentAttempts: Attempt[];
}): Promise<LessonSnapshot>;
writeAssessment(input: {
  topic: Topic; packet: SourcePacket; modes: Mode[];
  avoid: string[];              // short fingerprints of lesson items, not their text
}): Promise<AssessmentItem[]>;
gradeAnswer(input: { topic: Topic; item: AssessmentItem; response: Attempt["response"] }): Promise<Attempt["grade"]>;
```

The Planner's order of choice:

1. A review that is due, or a topic marked NEEDS_REVISIT.
2. A topic in progress.
3. **The redirect.** If the chosen topic's last grade was a misconception and one of its prerequisites isn't validated, choose that prerequisite instead.
4. Otherwise the next topic in the active module whose prerequisites are met.

Why the Planner isn't AI: these rules are simple and testable, and they cost nothing to run. The AI can phrase the `reason` later if the plain text feels flat.

Keeping the Tutor and Assessor apart (§26, rule 16): they get different prompts and different inputs. The Assessor receives the packet and fingerprints of the lesson's items, never the lesson text. Its grading prompt is told not to encourage and to use the five labels exactly as the baseline does.

Checking predict answers with code: when the Assessor writes "what does this print?", your browser runs the snippet in a Worker to get the true output. Your answer is compared with that, not with the AI's expected answer. If the two disagree, the item is thrown out and logged. This guards against the AI getting event-loop ordering wrong too.

Cost guard: a daily cap on lesson and assessment generation, with the count shown on Today. Expected cost is a few cents per lesson.

## 10. Minimal UI routes

| Route | Shows |
|---|---|
| `/lab` | Today: what to do next and why, reviews due, weak areas, recently proven |
| `/lab/topics` | Topic map grouped by module, with status and prerequisites |
| `/lab/topics/[id]` | Lesson, practice, lab, assessment, sources and this topic's history, in one page |

API routes: `GET /api/lab/today`, `POST /api/lab/topics/[id]/lesson`, `POST /api/lab/topics/[id]/assessment`, and `POST /api/lab/attempts`. All are owner-only and use the existing origin check on writes.

A new "Engineering Lab" entry goes in the workspace shell, next to Resume, Agent skills and Project Memory.

Why three pages instead of the handoff's six: §20 says the learning engine is the product, not the UI. History and Sources fit on the topic page until they outgrow it. Labs and Assessments are steps inside a topic, not places to browse.

Wording: **"topic" everywhere**, in the UI and in new code (decided 2026-10-01). Ken OS already has an "Agent skills" page, so "skill" would mean two things. Step 1 renames the Researcher's `skillId` to `topicId` so the module uses one word.

## 11. MVP scope for Modules 1–3

**Module 1: JavaScript runtime and async**

- Topics: `js.call_stack`, `js.event_loop`, `js.promises`, `js.closures`, `js.references_mutation`, `js.async_races`.
- Labs, all browser: event-loop order (predict), closure-in-loop bug (debug), shallow-copy mutation (debug), out-of-order search results fixed with AbortController (implement).
- Proof: predict and debug checked by code; explain graded by the Assessor.

**Module 2: HTTP and the browser**

- Topics: `web.request_lifecycle` (DNS, TCP, TLS at concept level), `web.https`, `web.cookies_sessions`, `web.cors`, `web.http_caching`.
- Labs: practice endpoints under `/api/lab/playground/*` that set real cookies, CORS headers and cache headers. You diagnose them with DevTools and answer what you saw; the server checks what your browser actually sent.
- Needs a second origin for CORS (see open questions).

**Module 3: Database transactions, concurrency and indexes**

- Topics: `db.transactions` (check only, already solid), `db.constraints`, `db.lost_update`, `db.atomic_updates`, `db.indexes`, `db.composite_indexes`, `db.query_plans`, `api.idempotency_basics`.
- Labs:
  - pglite: slow order history, add the right composite index, compare `EXPLAIN ANALYZE` before and after.
  - sandbox: oversold inventory under concurrent buyers, uniqueness race, and the same create request sent five times creating one row.
- This is the only module that adds infrastructure (Vercel Sandbox).

After Module 3, run §23's review: does the loop help, are lessons coherent, are sources enough, and does progress match real ability. Only then expand.

## 12. Implementation order

Each step ends with something testable.

1. **Topic map and baseline files** with loaders and validation. Move `research-targets.ts` into `topics.yaml`. *Check: tests for prerequisite cycles and missing ids.*
2. **Tables and migration** via `pnpm db:generate`, reviewed, then `pnpm db:migrate`. *Check: `test:db` style script.*
3. **Progress rules and Planner** as pure functions. *Check: tests that replay the real baseline and expect `js.event_loop` (or its prerequisite) first, and that reading a lesson never changes status.*
4. **Researcher saves to Postgres**, plus an import for today's saved packet.
5. **Tutor** with citation checks and lesson snapshots. *Check: one real lesson for `js.event_loop`, read by you.*
6. **Event-loop lab** with the browser runner and harness.
7. **Assessor:** writes questions, browser-verified predict answers, AI grading for explain answers.
8. **Attempt submission** updates progress and logs the status change.
9. **UI:** `/lab`, `/lab/topics`, `/lab/topics/[id]`, and the nav entry.
10. **Hosted check:** deploy, then complete the event-loop slice on the live URL from baseline to an updated Today page.

Steps 1–10 are the vertical slice in §27. The rest of Module 1, then Module 2, then Module 3 with the sandbox follow.

## v0 versus later

| In v0 | Later, when there's a measured need |
|---|---|
| Topic map in YAML, 3 modules | Full map from §24 |
| Rule-based Planner | AI-assisted planning or wording |
| Fixed review gaps (3/10/30/90 days) | Adaptive review scheduling |
| Labels per proof mode | Numeric scores |
| Browser and PGlite runners | Vercel Sandbox (Module 3), local runner reporting back |
| Note suggestions in lessons | Obsidian links or export |
| Daily generation cap | Cost and latency dashboards |
| None | Knowledge debt from git diffs and PRs (§18), checkpoints (§16), AI track labs (§17) |

Knowledge debt is deliberately not in v0 even though §18 calls it the key difference. It needs a working topic map and trustworthy progress first, or it would flag gaps against a scale that doesn't work yet. The schema is ready for it: an attempt's `kind` and the topic ids are what it will write against.

## Open questions for review

Decided by the owner on 2026-10-01:

- **Wording:** "topic" everywhere, UI and code.
- **Lab code:** written in a code box in the browser.
- **Confidence rating:** asked only on assessment and review answers.

Still open, needed before Module 2 rather than before the first slice:

- **Second origin for CORS labs.** The options are a Vercel deployment URL (each deployment has its own origin) or a small second project. Deployment URLs may sit behind Vercel's protection, which would need checking.
