# Engineering Lab v1 (proposal)

Status (2026-10-06): **partly built.** The course content, daily practice, placement checks and a roadmap are built and merged. The gate, knowledge debt and module checkpoints are not. The table below says which is which; the sections after it are the original proposal, each with a status line. v0 is live ([as built](engineering-lab-v0.md#as-built-2026-10-01)), and [the handoff](../product/ai-engineering-learning-handoff.md) stays the module's source of truth.

**Update 2026-10-02:** the polish this plan waits for is now defined in [engineering-lab-ui.md](engineering-lab-ui.md) and comes before the steps below. The full-course outline and placement checks from section 8 move up into that work; the roadmap graph stays here. **Update 2026-10-03:** that polish is built, including the full outline and placement checks, so v1 starts at step 1 below.

## Where v1 stands (2026-10-06)

| Part                                                   | Status                                                                         | Where it went                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 1. The gate: grade disputes, `/lab/health`, the review | **Not built.** The review waits on the owner taking the in-app baseline        |                                                          |
| 2. Knowledge debt                                      | **Not built**                                                                  |                                                          |
| 3. Production reliability                              | **Built**, as five topics                                                      | Chapter `m6-production-reliability`                      |
| 4. Observability                                       | **Built**, as three topics                                                     | Chapter `m7-observability`                               |
| 5. AI track, first module                              | **Built, and the whole AI track after it**                                     | Chapters `a1-retrieval` to `a4-ai-production`            |
| 6. Module checkpoints (one mixed scenario per module)  | **Not built.** "Checkpoint" now means a retake of the whole assessment instead | [engineering-lab-profile.md](engineering-lab-profile.md) |
| 7. Smaller changes                                     | **Not built**, apart from note suggestions shown in lessons                    |                                                          |
| 8. Roadmap and full course                             | **Built**, the roadmap as a rail on the lab home rather than a graph page      | [engineering-lab-profile.md](engineering-lab-profile.md) |
| 9. Daily practice                                      | **Built**                                                                      | `daily.ts`, `/lab/practice`                              |

The order changed from the plan below. The owner asked for a career profile and an in-app baseline on 2026-10-03, and for the whole course to be written on 2026-10-05, so the content and profile work went ahead of the gate. The gate's purpose still stands: once the baseline is taken, a few weeks of real use should show whether the loop works before knowledge debt or checkpoints are built.

## The short version (original proposal)

- **v1 starts with a gate, not a feature.** The handoff (§23) says to judge whether the learning loop works after the first three modules, and only then expand. v1 therefore opens with two to three weeks of real use and a short review built on numbers the app already records.
- **The headline feature is knowledge debt** (§18): flag the concepts that AI-written code puts in your projects before you've proven you understand them. It runs locally, so no client or work code ever leaves your machine.
- **Two new full-stack modules:** production reliability (retries, timeouts, background jobs, partial failures) and observability (logs, metrics, traces). These are the biggest clusters of gaps in the baseline.
- **The AI engineering track starts**, with retrieval evaluation and structured outputs, the two places your semantic search work leads next.
- **Checkpoints** (§16): one mixed scenario at the end of each module, to test whether the pieces work together.
- **Still no new infrastructure** unless a module needs it. The one candidate is a real Postgres for lock and isolation-level labs, which stays optional.
- **Daily practice** (section 9): a short hands-on set every day that mixes topics you have already learned, so they stay fresh. It comes right after the review.
- **After polish: a roadmap graph and a full course** (section 8). A visual map of the road ahead with a pace estimate, and a topic map that covers full-stack and AI engineering from top to bottom, not only your current gaps.

## 1. The gate: is v0 working?

**Status: not built.** Neither grade disputes nor `/lab/health` exist. The review needs real use, which starts when the owner takes the in-app baseline.

**Use v0 first.** Work through Module 1, and at least one topic each from Modules 2 and 3, before building any of v1.

The handoff asks five questions. v0 already records most of what answers them:

| Question (§23)                    | How v1 answers it                                                          | Already recorded?                                  |
| --------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------- |
| Is the learning loop effective?   | Attempts until a topic is proven; how often a proven topic slips at review | Yes, attempts and status changes                   |
| Does the UI help?                 | Your own notes, plus where you stopped mid-topic                           | Partly; add a one-line "what got in the way" note  |
| Are AI lessons coherent?          | Lessons rewritten; citations rejected per lesson                           | Yes, `rejected` is stored on each lesson           |
| Is source grounding enough?       | Researcher rejections; "open questions" left in packets                    | Yes, on each packet                                |
| Does progress match real ability? | Grades you dispute; questions thrown out because the answer key was wrong  | Thrown-out questions yes; disputes are new (below) |

**New in v1 for this:**

- **Dispute a grade.** A "this grade is wrong" button on any AI-graded answer, with one sentence of why. It doesn't change the grade; it records a disagreement. If more than about 1 in 10 written answers get disputed, the grader prompt needs work before anything else.
- **A loop health page** at `/lab/health`, owner only. One screen with the numbers in the table above, read straight from existing tables. No new tracking library.

**Decision rule:** if the review shows the loop doesn't help (for example, topics get "proven" without the knowledge holding at review), fix that first and push the rest of v1 back.

## 2. Knowledge debt from your code

**Status: not built.** No command, table or Today list yet. It's the largest unbuilt part of v1.

**What it does.** You point it at a range of commits in any of your repositories. It lists the engineering concepts that code relies on and shows each one's status in the lab:

```text
Commits 3a4acda..78d2425 in ken-os
✓ Transactions                proven
⚠ Idempotency keys            practicing
⚠ Retry with backoff          not started
? Dead-letter queue           not in the topic map
```

Anything not proven joins a "knowledge debt" list on Today. It never blocks your work; it only makes the gap visible.

**Why local.** Project Memory's rules forbid uploading work or client code, and so do these. The diff is read and classified on your machine. Only concept names, the repository name and commit hashes reach Ken OS. Code and file contents never do.

**How it fits together.**

1. `pnpm --filter @ken-os/web lab:debt -- --repo <path> --range <from>..<to>` reads `git diff` locally.
2. A local AI call maps the changes to topic ids from the topic map, plus suggested names for concepts the map doesn't have yet. The prompt gets the topic map's ids and titles, not the lab's content.
3. The command sends `{ repo, range, topics: [...], unknown: [...] }` to Ken OS with a scoped key, the same way Project Memory capture works.
4. A new `lab_debt_items` table stores each concept with its source and a status: open, queued, dismissed or resolved. It resolves itself when the topic is proven.
5. Unknown concepts appear as suggestions. Adding one to the map stays a reviewed change to `topics.yaml`; the app never edits the curriculum itself.

**Later, not v1:** running it automatically on every pull request, and hooking it into Claude Code sessions.

## 3. Module 4: production reliability

**Status: built** (2026-10-05) as chapter `m6-production-reliability`, with five topics instead of the eight below: `rel.background_jobs` (lab `job-queue`, which uses `FOR UPDATE SKIP LOCKED` in PGlite), `rel.retry_backoff` (`retry-policy`), `rel.timeouts` (`request-timeout`), `rel.partial_failures` (`order-saga`) and `rel.graceful_degradation` (`circuit-breaker`). Idempotent retries were already covered by `api.idempotency_basics`; the outbox and retry storms became parts of these labs' explanations rather than topics. No fake clock was added: the labs use short real waits with the harness's `wait(ms)`.

Baseline gaps: retries, timeouts, idempotency (beyond the basics), background jobs, partial failures and graceful degradation were all gap or partial (§3.3).

| Topic                      | Lab idea                                                                                                   | Runner         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------- |
| `rel.timeouts`             | A call to a slow fake provider hangs a request; add a timeout with `AbortSignal.timeout` and a clear error | Browser worker |
| `rel.retries`              | A flaky fake provider; add bounded retries with exponential backoff and jitter, and respect `Retry-After`  | Browser worker |
| `rel.retry_storms`         | Ten clients retry at once with no jitter; show the spike, then fix it                                      | Browser worker |
| `rel.idempotent_retries`   | Retrying a payment call creates duplicates; make the retry safe with the key from Module 3                 | PGlite         |
| `rel.background_jobs`      | Email sent inside the request slows checkout; move it to a jobs table with a worker loop                   | PGlite         |
| `rel.outbox`               | Order saved but the event is lost when the process dies; write both in one transaction, then deliver       | PGlite         |
| `rel.partial_failure`      | Order saved, CRM call fails, user sees an error; decide what is required versus what can be retried later  | PGlite         |
| `rel.graceful_degradation` | The cache goes down and login breaks; decide per feature what should fail open or closed                   | Browser worker |

Retries and timeouts need a fake clock so tests run in milliseconds. The harness gains a small `clock` helper; no new runner is needed.

## 4. Module 5: observability

**Status: built** (2026-10-05) as chapter `m7-observability`: `obs.logs` (lab `structured-logs`), `obs.metrics` (`latency-summary`) and `obs.traces` (`trace-context`, W3C `traceparent`). The incident-from-logs probe and the three-view checkpoint were not built.

Baseline: couldn't tell logs, metrics and traces apart; logging instincts were partial (§3.3).

- **`obs.structured_logs`:** rewrite string logs into structured ones with a request id, operation, status, duration and a safe user id; tests check the fields.
- **`obs.incident_from_logs`:** a probe-style lab. You get a log file from a fake incident and answer what broke, when, and for whom. The answer key comes from the generated data.
- **`obs.metrics`:** the same incident, but from three charts (error rate, latency, traffic). Which questions are now easy, and which are impossible?
- **`obs.traces`:** the same incident as a trace. Find the slow span.
- **Checkpoint:** compare what each of the three views showed and what each one missed.

All labs use generated, deterministic data in the browser. No real observability vendor is involved.

## 5. AI engineering track, first module

**Status: built, along with the rest of the AI track** (2026-10-05). Retrieval (`ai.semantic_search`, `ai.retrieval_eval`, `ai.rag`, `ai.advanced_rag`, `ai.reranking`), Model interfaces (`ai.structured_outputs`, `ai.tool_calling`, `ai.context_engineering`), Agents (`ai.agent_patterns`, `ai.agent_memory`, `ai.mcp`) and AI in production (`ai.evals`, `ai.observability`, `ai.cost_latency`, `ai.production_reliability`). Every lab uses scripted fake models, so a lab run makes no AI calls. The daily AI budget is still 20; it hasn't needed raising.

The handoff's sequence (§17) starts at semantic search, which you've begun. v1 covers the next two steps and stops there:

- **`ai.retrieval_eval`:** a fixed corpus with known relevant passages for each question. You compute Recall@K for a baseline, change one thing (chunk size, top-k, query rewrite), measure again and explain the difference. Embeddings for the fixed corpus are computed once, stored in the repo and checked by tests, so a lab run makes no AI calls.
- **`ai.structured_outputs`:** make a model's answer fit an app's schema, then handle the cases where it doesn't. The lab grades your validation and fallback code, not the model.

**Freshness:** these topics use the 14-day refresh class, so lessons pick up current provider features. Labs stay vendor-neutral, as §12 asks.

**Cost:** live model calls are capped per run and counted toward the daily AI budget, which rises from 20 to 40 for this track.

## 6. Checkpoints

**Status: not built.** No chapter has a mixed end-of-chapter scenario. The word "checkpoint" is now used for retaking the whole assessment after the baseline ([engineering-lab-profile.md](engineering-lab-profile.md)); a per-chapter scenario would need another name.

At the end of each module there's one mixed scenario, like §16's broken checkout. For Module 3, for example: overselling, duplicate charges and a slow order history, all in one small app.

- It runs as one PGlite lab with several test groups.
- After the tests, the Assessor asks two design questions: what you fixed first, and what you'd watch in production.
- A passed checkpoint is shown on Today but doesn't change any topic's status. It measures whether the pieces work together, not each piece again.

## 7. Smaller changes

**Status: mostly not built.** Lessons show "For your notes" suggestions, but there's no copy-to-Obsidian button. Lock and isolation labs on Neon branches, server-side probe re-scoring, and pinning or self-hosting PGlite (still loaded from jsDelivr in `runner/harness.ts`) are all open.

- **Review sessions** are now part of daily practice (section 9).
- **Obsidian export** (§21). At the end of a lesson, "copy note scaffold" copies a Markdown stub with the topic, its sources and the note suggestions. You still write the note yourself.
- **Lock and isolation-level labs.** Real `SELECT ... FOR UPDATE`, deadlocks and isolation levels need parallel database connections, which PGlite can't provide. **Recommended:** a throwaway Neon branch per run, created and deleted by the server, instead of Vercel Sandbox, because Ken OS already uses Neon. Build it only if Module 3's review shows the need.
- **Known v0 gaps to close:**
  - Lab results come from the learner's browser. That's fine for one owner, but the server should at least re-run probe scoring itself.
  - PGlite loads from a CDN. Pin its integrity, or serve it from Ken OS.
  - Check the probes in Firefox and Safari.

## 8. After polish: a roadmap graph and a full course

**Status: built**, in a different shape. The roadmap is a rail of chapter stages on the lab home, with a pace estimate, not a `/lab/roadmap` graph page (design chosen 2026-10-03, see [engineering-lab-profile.md](engineering-lab-profile.md)). The full course is written: 52 topics in 13 chapters across two tracks, 48 labs, and placement checks for topics you already know (2026-10-05).

The owner asked for both on 2026-10-01, to come once the current build is polished and improved. They come after steps 1 to 9 below, not alongside them.

**Why they're missing today.** v0's map holds only the topics the baseline flagged as gaps, plus two prerequisites, because §23 says not to generate the whole curriculum up front. That made it a good start, but it isn't a course: nothing yet takes you through full-stack or AI engineering from top to bottom. And `/lab/topics` is a flat list, so there's no view of the road ahead.

### A roadmap timeline graph

A `/lab/roadmap` page that draws the topic map as a graph, one track per row:

- **Every topic as a node**, shaded by status: proven, in progress, needs another look, or not started.
- **Lines for "builds on"**, so you can see what blocks a topic and what it opens up.
- **"You are here"** at the Planner's current pick, with the path to the end of each track highlighted.
- **A pace projection.** Using how long your proven topics actually took, it estimates when you'd reach each track's end at your current pace. It's labelled as an estimate and moves as you go.

The graph follows the prerequisite map, not a calendar, so it stays within §9's rule against a fixed week-by-week course. All the data already exists: topics, prerequisites, statuses, and when each topic was proven. A hand-drawn SVG is enough at about 50 nodes; a graph library only if that stops being true.

### A full course, top to bottom

Grow the topic map from "your gaps" to the whole of §24: about 46 topics across the full-stack, production and AI engineering tracks, in prerequisite order.

- **New topics without a baseline entry** already work; they start as "not assessed".
- **No reteaching what you know.** A topic you already know gets a short placement check: the Assessor's questions, with no lesson first. Pass it, and the topic is proven the normal way. This extends the v0 rule that baseline-solid topics skip the lesson.
- **The Planner needs no change.** It already orders topics by prerequisites and redirects to weak ones.
- **The gaps stay the priority.** Topics the baseline flagged are scheduled first, so the full course doesn't slow down the repair work.

**The real work is content, not code:** writing the prerequisite links, the gap or goal for each topic, and labs for about 30 more topics. That should be done a track at a time and reviewed like code, in the repo.

## 9. Daily practice

**Status: built** as described below, with its own page at `/lab/practice` and the `lab_daily_sets` table. It pauses while an assessment is running.

The owner asked for this on 2026-10-01. Every day there's a short, hands-on set of practice that keeps what you've learned fresh, so proven topics don't quietly fade.

**What a day looks like.** A "Today's practice" card at the top of `/lab`, about 15 minutes, with four or five items:

- **One or two predictions**: fresh snippets from the Assessor, checked by running them, like the checks in v0.
- **One hands-on fix**: an authored lab from a topic you've already proven, started again from its starter code. Repeating an exercise is normally avoided, but §26 rule 17 allows it exactly when the point is retention.
- **One or two short explanations**: one-paragraph answers, graded by the Assessor.

Items mix topics instead of grouping them, because switching between topics is what makes recall stick.

**How items are chosen**, in this order:

1. Reviews that are due, or topics that need another look.
2. Proven topics you haven't touched for the longest time.
3. Topics with open misconceptions.
4. A topic in progress, so the set isn't only revision.

**How it counts.** Practice answers are recorded as reviews, so they use the progress rules that already exist:

- A solid answer on a due topic moves its next review further out.
- A slip marks the topic "needs another look", and the Planner brings it back.
- Nothing is proven from practice alone that wasn't proven already.
- The confidence rating applies, as it does for every review.

**What it doesn't do:**

- No streaks, points or badges. The handoff's §25 rules out gamification.
- Today shows whether today's set is done, and nothing more.
- Missing a day costs nothing; the next set simply leans harder on what's due.

**Cost and build.**

- **Cost:** one small question set a day counts toward the daily AI budget; the rest reuses authored labs and needs no AI.
- **Data:** a new `lab_daily_sets` table stores each day's items, so the set is stable if you leave and come back.
- **Code:** answers reuse the existing attempt route with kind `review`.
- **Before anything is proven:** until the first topic is proven, the card offers a short warm-up from in-progress topics instead.

## Implementation order

Status (2026-10-06): steps 3, 5, 6, 7, 10 and 11 are built; steps 1, 2, 4, 8 and 9 are not.

Each step ends with something you can use or check.

1. **Gate tooling:** grade disputes and `/lab/health`. _Check: numbers match a hand count on your real data._
2. **Use v0 for two to three weeks, then hold the review.** Record the outcome in [engineering-lab.md](engineering-lab.md).
3. **Daily practice** (section 9). It comes first after the review because it protects everything already proven, and it reuses existing parts. _Check: a day's set is stable across reloads, mixes topics, and a slip sets "needs another look"._
4. **Knowledge debt:** the local command, the scoped key, `lab_debt_items`, and the list on Today. _Check: run it on ken-os's own recent commits._
5. **Module 4 labs**, with the fake clock in the harness. _Check: every starter fails and every solution passes._
6. **Module 5 labs.**
7. **AI track: retrieval evaluation, then structured outputs.**
8. **Checkpoints** for Modules 1 to 3, then 4 and 5.
9. **Smaller changes**, as the review shows they matter.
10. **After polish: the roadmap graph.** _Check: it matches the Topics page node for node, and the projection updates when a topic is proven._
11. **After polish: the full course**, one track at a time, with placement checks for topics you already know. _Check: every new lab's starter fails and its solution passes, and the Planner's order still puts baseline gaps first._

## Not in v1

Several of these were later done anyway: the full §24 map, and agent patterns, MCP, memory and evals (all written 2026-10-05). The rest still stands.

- More than one learner, public pages, or sharing.
- Gamification: streaks, points, badges.
- The full §24 map during the main v1 work. Steps 1 to 9 add 14 topics; the rest comes with the full course (section 8), after polish.
- Agent patterns, MCP, memory and evals from the AI track. They follow once retrieval evaluation is proven.
- Automatic pull request checks for knowledge debt.
- Any change that lets the app edit the curriculum by itself.

## Questions for review

Questions 1 and 3 were overtaken: Modules 4 and 5 and the whole AI track are written, and knowledge debt is next in line if the gate review supports it. Questions 2 and 4 are still open.

1. **Order:** knowledge debt before Modules 4 and 5, or the other way round? Knowledge debt is the differentiator; the modules are where the most baseline gaps are.
2. **Which repositories** should knowledge debt be allowed to read? Ken OS only at first, or any repository you choose each time?
3. **AI track timing:** start it alongside Module 4, or only after Modules 4 and 5?
4. **Gate length:** is two to three weeks of use realistic, or should the review happen after a fixed number of proven topics instead?
