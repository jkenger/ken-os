# Engineering Lab v1 (proposal)

Status: **proposed, awaiting owner review.** Nothing here is built. v0 is live ([as built](engineering-lab-v0.md#as-built-2026-10-01)), and [the handoff](../product/ai-engineering-learning-handoff.md) stays the module's source of truth.

## The short version

- **v1 starts with a gate, not a feature.** The handoff (§23) says to judge whether the learning loop works after the first three modules, and only then expand. v1 therefore opens with two to three weeks of real use and a short review built on numbers the app already records.
- **The headline feature is knowledge debt** (§18): flag the concepts that AI-written code puts in your projects before you've proven you understand them. It runs locally, so no client or work code ever leaves your machine.
- **Two new full-stack modules:** production reliability (retries, timeouts, background jobs, partial failures) and observability (logs, metrics, traces). These are the biggest clusters of gaps in the baseline.
- **The AI engineering track starts**, with retrieval evaluation and structured outputs, the two places your semantic search work leads next.
- **Checkpoints** (§16): one mixed scenario at the end of each module, to test whether the pieces work together.
- **Still no new infrastructure** unless a module needs it. The one candidate is a real Postgres for lock and isolation-level labs, which stays optional.
- **After polish: a roadmap graph and a full course** (section 8). A visual map of the road ahead with a pace estimate, and a topic map that covers full-stack and AI engineering from top to bottom, not only your current gaps.

## 1. The gate: is v0 working?

**Use v0 first.** Work through Module 1, and at least one topic each from Modules 2 and 3, before building any of v1.

The handoff asks five questions. v0 already records most of what answers them:

| Question (§23) | How v1 answers it | Already recorded? |
|---|---|---|
| Is the learning loop effective? | Attempts until a topic is proven; how often a proven topic slips at review | Yes, attempts and status changes |
| Does the UI help? | Your own notes, plus where you stopped mid-topic | Partly; add a one-line "what got in the way" note |
| Are AI lessons coherent? | Lessons rewritten; citations rejected per lesson | Yes, `rejected` is stored on each lesson |
| Is source grounding enough? | Researcher rejections; "open questions" left in packets | Yes, on each packet |
| Does progress match real ability? | Grades you dispute; questions thrown out because the answer key was wrong | Thrown-out questions yes; disputes are new (below) |

**New in v1 for this:**

- **Dispute a grade.** A "this grade is wrong" button on any AI-graded answer, with one sentence of why. It doesn't change the grade; it records a disagreement. If more than about 1 in 10 written answers get disputed, the grader prompt needs work before anything else.
- **A loop health page** at `/lab/health`, owner only. One screen with the numbers in the table above, read straight from existing tables. No new tracking library.

**Decision rule:** if the review shows the loop doesn't help (for example, topics get "proven" without the knowledge holding at review), fix that first and push the rest of v1 back.

## 2. Knowledge debt from your code

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

Baseline gaps: retries, timeouts, idempotency (beyond the basics), background jobs, partial failures and graceful degradation were all gap or partial (§3.3).

| Topic | Lab idea | Runner |
|---|---|---|
| `rel.timeouts` | A call to a slow fake provider hangs a request; add a timeout with `AbortSignal.timeout` and a clear error | Browser worker |
| `rel.retries` | A flaky fake provider; add bounded retries with exponential backoff and jitter, and respect `Retry-After` | Browser worker |
| `rel.retry_storms` | Ten clients retry at once with no jitter; show the spike, then fix it | Browser worker |
| `rel.idempotent_retries` | Retrying a payment call creates duplicates; make the retry safe with the key from Module 3 | PGlite |
| `rel.background_jobs` | Email sent inside the request slows checkout; move it to a jobs table with a worker loop | PGlite |
| `rel.outbox` | Order saved but the event is lost when the process dies; write both in one transaction, then deliver | PGlite |
| `rel.partial_failure` | Order saved, CRM call fails, user sees an error; decide what is required versus what can be retried later | PGlite |
| `rel.graceful_degradation` | The cache goes down and login breaks; decide per feature what should fail open or closed | Browser worker |

Retries and timeouts need a fake clock so tests run in milliseconds. The harness gains a small `clock` helper; no new runner is needed.

## 4. Module 5: observability

Baseline: couldn't tell logs, metrics and traces apart; logging instincts were partial (§3.3).

- **`obs.structured_logs`:** rewrite string logs into structured ones with a request id, operation, status, duration and a safe user id; tests check the fields.
- **`obs.incident_from_logs`:** a probe-style lab. You get a log file from a fake incident and answer what broke, when, and for whom. The answer key comes from the generated data.
- **`obs.metrics`:** the same incident, but from three charts (error rate, latency, traffic). Which questions are now easy, and which are impossible?
- **`obs.traces`:** the same incident as a trace. Find the slow span.
- **Checkpoint:** compare what each of the three views showed and what each one missed.

All labs use generated, deterministic data in the browser. No real observability vendor is involved.

## 5. AI engineering track, first module

The handoff's sequence (§17) starts at semantic search, which you've begun. v1 covers the next two steps and stops there:

- **`ai.retrieval_eval`:** a fixed corpus with known relevant passages for each question. You compute Recall@K for a baseline, change one thing (chunk size, top-k, query rewrite), measure again and explain the difference. Embeddings for the fixed corpus are computed once, stored in the repo and checked by tests, so a lab run makes no AI calls.
- **`ai.structured_outputs`:** make a model's answer fit an app's schema, then handle the cases where it doesn't. The lab grades your validation and fallback code, not the model.

**Freshness:** these topics use the 14-day refresh class, so lessons pick up current provider features. Labs stay vendor-neutral, as §12 asks.

**Cost:** live model calls are capped per run and counted toward the daily AI budget, which rises from 20 to 40 for this track.

## 6. Checkpoints

At the end of each module there's one mixed scenario, like §16's broken checkout. For Module 3, for example: overselling, duplicate charges and a slow order history, all in one small app.

- It runs as one PGlite lab with several test groups.
- After the tests, the Assessor asks two design questions: what you fixed first, and what you'd watch in production.
- A passed checkpoint is shown on Today but doesn't change any topic's status. It measures whether the pieces work together, not each piece again.

## 7. Smaller changes

- **Review sessions.** Due reviews run as one session that mixes topics, instead of one topic at a time.
- **Obsidian export** (§21). At the end of a lesson, "copy note scaffold" copies a Markdown stub with the topic, its sources and the note suggestions. You still write the note yourself.
- **Lock and isolation-level labs.** Real `SELECT ... FOR UPDATE`, deadlocks and isolation levels need parallel database connections, which PGlite can't provide. **Recommended:** a throwaway Neon branch per run, created and deleted by the server, instead of Vercel Sandbox, because Ken OS already uses Neon. Build it only if Module 3's review shows the need.
- **Known v0 gaps to close:**
  - Lab results come from the learner's browser. That's fine for one owner, but the server should at least re-run probe scoring itself.
  - PGlite loads from a CDN. Pin its integrity, or serve it from Ken OS.
  - Check the probes in Firefox and Safari.

## 8. After polish: a roadmap graph and a full course

The owner asked for both on 2026-10-01, to come once the current build is polished and improved. They come after steps 1 to 8 below, not alongside them.

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

## Implementation order

Each step ends with something you can use or check.

1. **Gate tooling:** grade disputes and `/lab/health`. *Check: numbers match a hand count on your real data.*
2. **Use v0 for two to three weeks, then hold the review.** Record the outcome in [engineering-lab.md](engineering-lab.md).
3. **Knowledge debt:** the local command, the scoped key, `lab_debt_items`, and the list on Today. *Check: run it on ken-os's own recent commits.*
4. **Module 4 labs**, with the fake clock in the harness. *Check: every starter fails and every solution passes.*
5. **Module 5 labs.**
6. **AI track: retrieval evaluation, then structured outputs.**
7. **Checkpoints** for Modules 1 to 3, then 4 and 5.
8. **Smaller changes**, as the review shows they matter.
9. **After polish: the roadmap graph.** *Check: it matches the Topics page node for node, and the projection updates when a topic is proven.*
10. **After polish: the full course**, one track at a time, with placement checks for topics you already know. *Check: every new lab's starter fails and its solution passes, and the Planner's order still puts baseline gaps first.*

## Not in v1

- More than one learner, public pages, or sharing.
- Gamification: streaks, points, badges.
- The full §24 map during the main v1 work. Steps 1 to 8 add 14 topics; the rest comes with the full course (section 8), after polish.
- Agent patterns, MCP, memory and evals from the AI track. They follow once retrieval evaluation is proven.
- Automatic pull request checks for knowledge debt.
- Any change that lets the app edit the curriculum by itself.

## Questions for review

1. **Order:** knowledge debt before Modules 4 and 5, or the other way round? Knowledge debt is the differentiator; the modules are where the most baseline gaps are.
2. **Which repositories** should knowledge debt be allowed to read? Ken OS only at first, or any repository you choose each time?
3. **AI track timing:** start it alongside Module 4, or only after Modules 4 and 5?
4. **Gate length:** is two to three weeks of use realistic, or should the review happen after a fixed number of proven topics instead?
