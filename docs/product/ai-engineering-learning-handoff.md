# AI Engineering Learning System — Assessment + Build Handoff

**Date:** 2026-10-01  
**Purpose:** Durable handoff for Claude Code to design and build a personalized, adaptive Full-stack + AI Engineering learning system.  
**Primary goal:** Create one effective source of learning that combines theory, current authoritative sources, hands-on coding, debugging, quizzes, validation, and progress tracking without forcing the learner to jump across many unrelated resources.

---

# 1. Learner Context

The learner is an experienced product-oriented full-stack developer who has built real applications and can reason about product architecture, APIs, schemas, auth, storage boundaries, and AI integration. The learner has also increasingly relied on AI-assisted coding, which has created a gap between what can be built and what can be confidently explained or reasoned about under the hood.

The goal is **not** to restart software engineering from zero.

The target direction is:

> **Full-stack Software Engineer → stronger production/system depth → AI Product Engineer / AI Engineer**

The learning system should preserve existing strengths, repair weak mental models, and deepen production engineering while continuing AI Engineering in parallel.

The learner prefers:
- practical learning over generic curriculum lists
- one main source of learning instead of many scattered resources
- concise theory followed immediately by application
- exercises that can actually be run
- objective validation rather than “watched/read = learned”
- adaptive sequencing based on demonstrated mastery
- Claude Code as a development and tutoring tool
- files/repo state as durable source of truth instead of chat memory
- Obsidian for personal notes, but not as the primary competency tracker
- project-based application through real projects when relevant
- no unnecessary overengineering

---

# 2. Baseline Assessment (retired)

Sections 2 to 4 held a baseline copied from a chat on 2026-10-01: assessment labels, per-topic detail and a
competency summary. The owner retired it on 2026-10-06, before taking the in-app baseline. The baseline is now the
in-app assessment, where every question, answer, confidence rating and grade is stored and can be re-checked:
[engineering-lab-profile.md](../architecture/engineering-lab-profile.md) (rules) and
[engineering-assessment-v2.md](../architecture/engineering-assessment-v2.md) (two stages, the Assessor). Topic gaps
in `topics.yaml` now say what each topic teaches; personal gaps come from your own answers. The 2026-10-01 text
lives only in git history.

The answer labels it introduced stay in use: **Solid**, **Partial**, **Rusty**, **Misconception**, **Gap**.

---

# 5. Target Learning Outcome

The system should move the learner toward:

> **AI Product Engineer / AI Engineer with strong Full-stack and production engineering foundations**

The system must not force a false choice between “Full-stack Developer” and “AI Engineer.”

The intended progression is:

```text
Existing Full-stack/Product Experience
        +
Foundation Repair
        +
Production Engineering Depth
        +
AI Engineering
        ↓
AI Product Engineer
```

---

# 6. Product Vision

Build a personalized engineering learning system that continuously answers:

1. What do I already understand?
2. What do I misunderstand?
3. What should I learn next?
4. What is the minimum theory I need?
5. How do I apply it immediately?
6. How do we objectively verify I learned it?
7. When should I revisit it?
8. Which concepts am I using in projects without understanding?

The system should become the learner’s **primary learning environment**.

External sources should be used as authoritative grounding and references, not as a requirement to manually bounce between many courses.

---

# 7. Core Learning Loop

```text
ASSESS
  ↓
PLAN
  ↓
RESEARCH
  ↓
TEACH
  ↓
PREDICT
  ↓
PRACTICE
  ↓
DEBUG
  ↓
VALIDATE
  ↓
REMEMBER
  ↓
ADAPT
```

Each major skill should eventually be validated through several modes:
- **Explain** — explain concept without prompts
- **Predict** — predict code/system behavior before execution
- **Debug** — diagnose broken implementation
- **Implement** — build/fix something runnable
- **Review** — inspect existing code and identify risks
- **Design** — make architecture/tradeoff decisions

Watching a video or reading a lesson must never equal mastery.

---

# 8. Durable Source of Truth

Do **not** rely on Claude chat memory.

The repository state must be authoritative.

Suggested structure:

```text
engineering-lab/
├── app/
├── curriculum/
│   ├── skill-graph.yaml
│   ├── fullstack.yaml
│   ├── production-engineering.yaml
│   └── ai-engineering.yaml
├── learner/
│   ├── baseline-assessment.md
│   ├── mastery.json
│   ├── attempts.json
│   ├── learning-history.md
│   └── preferences.yaml
├── modules/
├── labs/
├── challenges/
├── sources/
├── evaluations/
└── docs/
```

Do not assume this structure is final. Start simple, but preserve explicit separation between:
- curriculum
- learner state
- generated content
- executable labs
- evaluation results
- source metadata

---

# 9. Skill Graph, Not Static Weekly Curriculum

Do not use a rigid week-based course.

Model skills as prerequisite relationships.

Examples:

```text
Event Loop
  ↓
Promises
  ↓
Async Request Races
  ↓
Retries / Timeouts

References & Mutation
  ↓
React State
  ↓
Rendering
  ↓
Memoization

Transactions
  ↓
Concurrency
  ↓
Idempotency
  ↓
Background Jobs
  ↓
Distributed Reliability
```

The planner should be able to decide that a failed higher-level skill is blocked by a weaker prerequisite and redirect learning accordingly.

---

# 10. Mastery Model

Mastery must be evidence-based.

Suggested shape:

```json
{
  "skill": "database.composite_indexes",
  "status": "PRACTICING",
  "mastery": 0.62,
  "confidence": 0.40,
  "last_attempt": "2026-10-01",
  "evidence": {
    "explain": 0.70,
    "predict": 0.80,
    "debug": 0.50,
    "implement": 0.60,
    "review": 0.40,
    "design": 0.50
  },
  "weaknesses": [
    "index column order",
    "query planner interpretation"
  ],
  "next_review_at": null
}
```

Initial statuses:

```text
NOT_STARTED
LEARNING
PRACTICING
VALIDATED
NEEDS_REVISIT
```

Do not overfit exact percentages too early. The model can begin categorical and become numeric later.

Track **confidence separately from competence**.

---

# 11. AI Roles

Do not begin with four separate deployed agents unless there is a strong implementation reason.

Implement these as distinct logical workflows/prompts:

## Planner
Inputs:
- mastery state
- failed assessments
- prerequisite graph
- recent learning
- review schedule
- project-derived knowledge debt

Output:
- next skill
- reason
- target depth
- required validation modes

## Researcher
Purpose:
- retrieve current authoritative information
- produce a bounded source packet

Source priority:
1. standards/specifications where appropriate
2. official documentation
3. framework/provider official docs
4. high-quality technical references
5. community sources only when useful for practical nuance

The Researcher should avoid noisy web-wide synthesis when official sources are sufficient.

## Tutor
Inputs:
- source packet
- learner baseline
- known misconceptions
- prior attempts

Output:
- concise explanation
- examples
- analogies where useful
- prediction tasks
- practical exercises

The Tutor should not reteach material already demonstrated as solid.

## Assessor
Purpose:
- independently evaluate whether the learner understands the skill

The Assessor should not optimize for encouragement.
It should distinguish:
- solid understanding
- partial understanding
- rusty recall
- misconception
- knowledge gap

It should create new variations instead of reusing exact examples from the lesson.

---

# 12. Source-Grounded Dynamic Learning

Curriculum capabilities should be durable, while implementation details can be refreshed dynamically.

Example durable skill:

> Reliably constrain model output to an application contract.

Dynamic implementation may use current OpenAI, Anthropic, AI SDK, or other provider mechanisms.

Do not hardcode current vendor SDK syntax as the skill itself.

For each generated lesson, preserve source metadata:

```yaml
skill: database.composite_indexes
generated_at: 2026-10-01
source_checked_at: 2026-10-01
sources:
  - title: PostgreSQL Multicolumn Indexes
    type: official_docs
    retrieved_at: 2026-10-01
```

Suggested freshness behavior:
- core CS concepts: rare refresh
- web platform: periodic refresh
- frameworks: frequent refresh
- AI providers/frameworks/MCP ecosystem: very frequent refresh

Generated lessons should be saved as stable snapshots instead of changing every time the learner opens them.

---

# 13. Lesson Design

A learning module should not be a long static article.

Preferred structure:

```text
1. Why this matters
2. What you already know
3. The exact gap being repaired
4. Minimum theory
5. Mental model
6. Worked example
7. Prediction questions
8. Runnable exercise
9. Broken implementation/debugging task
10. Short quiz
11. Explanation prompt
12. Validation
13. Reflection / personal note prompts
```

Example for composite indexes:
- explain B-tree ordering
- explain composite index ordering
- predict whether index A serves query B
- run `EXPLAIN ANALYZE`
- modify index
- measure improvement
- diagnose intentionally bad index
- explain why final index works

---

# 14. Executable Labs

Do not generate only vague prompts.

Labs should be runnable.

Example:

```text
labs/idempotency/
├── README.md
├── starter/
├── tests/
└── solution/
```

A good exercise:

> The test sends the same payment request five times concurrently. Exactly one payment record must be created.

Objective validation:

```bash
pnpm test
```

Use:
- Vitest / Node test runner
- integration tests
- Postgres test DB where appropriate
- Docker Compose for Redis/Postgres/services where needed
- seed scripts
- deterministic datasets

AI should evaluate reasoning; automated tests should evaluate behavior whenever possible.

---

# 15. Intentional Failure Labs

Create labs that contain real bugs.

Priority labs, first written for the gaps the retired 2026-10-01 baseline found:

## JavaScript
- event-loop ordering
- Promise/microtask ordering
- closure bugs
- shallow-copy mutation

## React
- stale effect
- stale closure
- request race
- unnecessary renders
- incorrect memoization
- incorrect dependency arrays

## Browser / HTTP
- cookie not being sent
- CORS misconfiguration
- stale cache
- wrong cache headers
- auth/session failure

## Backend
- mass assignment
- broken resource authorization
- bad validation boundary
- duplicate API retry
- partial failure

## Database
- missing index
- wrong composite index
- N+1 query
- lost update
- oversold inventory
- uniqueness race
- pagination degradation

## Reliability
- provider timeout
- retry storm
- duplicate jobs
- Redis outage
- bad fallback policy
- queue poison message

## Observability
- insufficient logs
- diagnose incident using logs
- then add metrics
- then add traces
- compare what each reveals

## AI
- bad chunking
- weak retrieval
- irrelevant vector matches
- no reranking
- hallucination from missing context
- broken structured output
- unsafe tool access
- agent retry loop
- poor evaluation coverage

---

# 16. Checkpoints / “Boss Fights”

After several skills, give integrated scenarios rather than isolated quizzes.

Example Production Engineering Checkpoint:

System symptoms:
- inventory overselling
- duplicate charges
- slow order history
- email delaying checkout
- retries creating duplicates
- Redis outage breaking login
- poor logs

Learner must:
- inspect
- prioritize
- explain
- fix
- validate
- discuss tradeoffs

These checkpoints should measure integration, not memorization.

---

# 17. AI Engineering Track

Continue AI Engineering in parallel with foundation repair.

Suggested durable capability sequence:

```text
Semantic Search
→ Retrieval Fundamentals
→ RAG
→ Advanced Retrieval / Reranking
→ Structured Outputs
→ Tool Calling
→ Context Engineering
→ Agent Patterns
→ State / Memory
→ MCP
→ Evals
→ Tracing / Observability
→ Cost / Latency Optimization
→ Production AI Reliability
```

The learner has already started:
- vectors and dimensions
- embeddings
- sparse vs dense vectors
- vector storage
- HNSW / approximate nearest neighbor concepts
- semantic search course material

Do not restart these from zero. Reassess and continue.

AI modules must be engineering-oriented.

Example RAG module:

```text
Theory:
- ingestion
- chunking
- embeddings
- retrieval
- top-k
- reranking
- context construction

Lab:
- ingest controlled corpus
- define known relevant answers
- implement retrieval
- calculate Recall@K
- inspect failures
- improve retrieval
- measure again

Validation:
- explain why change improved/worsened retrieval
- justify chunking/top-k/reranking choices
```

Example agent/tool module:
- defined task dataset
- expected tool usage
- tool selection accuracy
- unnecessary calls
- latency
- token cost
- failure recovery
- prohibited operations

---

# 18. Code-to-Curriculum / Knowledge Debt

This is a key differentiator.

The system should eventually analyze Git diffs, PRs, or selected project code and detect engineering concepts introduced by AI or by the learner.

Example:

```text
Recent code introduced:
✓ DB transactions          VALIDATED
⚠ idempotency              WEAK
⚠ queue retry policy       WEAK
? dead-letter queue        UNKNOWN
```

Then add appropriate concepts to the learning queue.

This directly addresses the learner’s core concern:

> AI-assisted development can move faster than understanding.

Do not necessarily block development; surface “knowledge debt” clearly.

Potential inputs later:
- local Git diff
- GitHub PR
- selected files
- architecture docs
- Claude Code generated changes

---

# 19. Resource Strategy

The app should be the main learning interface.

External resources are supporting references.

For each skill:
- internal synthesized lesson
- one or two authoritative references
- optional deeper resources

Avoid:
- giant lists of links
- multiple competing courses
- random YouTube/tutorial hopping
- making resource consumption the definition of progress

The system should summarize and synthesize current sources into one coherent lesson.

---

# 20. Dashboard / UX

Do not build a full LMS initially.

A useful home dashboard could show:

```text
TODAY

Continue:
Race Conditions & Atomic Operations
Progress: 60%

Next:
Prevent Inventory Overselling

Weak Areas:
- Concurrency
- HTTP caching
- Observability
- React effects

Recently Validated:
- Transactions
- Authorization

Knowledge Debt:
3 concepts detected from project code
```

Core pages:
- Today
- Curriculum / Skill Graph
- Labs
- Assessments
- History
- Sources

The UI is not the core product.

The learning engine is.

---

# 21. Obsidian Integration

Do not replace Obsidian.

The app tracks competence.

Obsidian holds personal notes and learner-written understanding.

At lesson completion, suggest concepts to capture:

```text
Suggested personal notes:
- Event Loop
- Microtasks
- Task Queue
```

The learner should write the final note in their own words.

Optional later:
- link to Obsidian note names
- export lesson summary
- export validated concept list

---

# 22. MVP Technical Direction

Start simple.

Suggested v0 stack:

```text
Next.js
TypeScript
SQLite or Postgres
Drizzle
Markdown/MDX lessons
YAML/JSON skill graph
Vitest
Docker Compose for lab dependencies
Claude Code
LLM API
Web/document retrieval
Git
```

Possible later additions:
- Postgres if starting on SQLite
- pgvector
- Redis
- background worker
- sandboxed code execution
- GitHub integration
- Obsidian integration
- spaced repetition/review scheduler

Do not introduce Redis, event buses, brokers, or microservices unless a measured requirement appears.

---

# 23. First MVP Modules

Do **not** generate the entire curriculum upfront.

Build and validate the learning loop using three high-value modules:

## Module 1 — JavaScript Runtime & Async Mental Models
Focus:
- call stack
- event loop
- tasks vs microtasks
- Promises
- closures
- references/mutation
- async races

Validation:
- predict execution order
- debug stale async behavior
- explain closure lifetime
- mutation/shallow-copy exercises
- small implementation

## Module 2 — HTTP / Browser Mental Model
Focus:
- DNS
- TCP/TLS at conceptual level
- HTTP request/response
- HTTPS
- headers
- cookies
- sessions
- CORS
- caching
- browser security boundaries

Validation:
- trace URL request lifecycle
- diagnose cookie failure
- diagnose CORS issue
- explain cache behavior
- distinguish auth vs browser cross-origin policy

## Module 3 — Database Transactions, Concurrency & Indexing
Focus:
- transactions
- constraints
- lost updates
- concurrent inventory
- isolation concepts
- atomic updates
- indexes
- composite indexes
- query plans
- idempotency foundation

Validation:
- reproduce overselling race
- fix it
- inspect slow query
- add appropriate index
- use `EXPLAIN ANALYZE`
- explain result
- solve uniqueness race
- design retry-safe create flow

After these three modules, evaluate:
- whether the learning loop is effective
- whether the UI helps
- whether AI-generated lessons are coherent
- whether source grounding is sufficient
- whether mastery updates match real performance

Only then expand.

---

# 24. Initial Skill Graph Priorities

## Full-stack Repair
1. JS Runtime
2. Closures / References
3. Async behavior
4. Browser request lifecycle
5. HTTP / HTTPS
6. Cookies / Sessions / CORS
7. Browser/server caching
8. React render model
9. Effects and synchronization
10. Async UI races
11. Runtime validation
12. DB indexes/query plans
13. Transactions
14. Concurrency
15. Constraints
16. Pagination

## Production Engineering
1. Testing strategy
2. Authorization depth
3. XSS / web security
4. Background jobs
5. Retry / backoff
6. Timeouts
7. Idempotency
8. Partial failures
9. Graceful degradation
10. Logs
11. Metrics
12. Traces
13. Caching strategy
14. Scaling
15. Multi-tenancy
16. System evolution

## AI Engineering
1. Semantic search
2. Retrieval evaluation
3. RAG
4. Advanced RAG
5. Reranking
6. Structured outputs
7. Tool calling
8. Context engineering
9. Agent patterns
10. State / memory
11. MCP
12. Evals
13. AI observability
14. Cost / latency
15. Production reliability

---

# 25. Non-Goals

For v0, do not:
- build a polished SaaS
- support multiple learners
- create a marketplace
- generate 100+ modules
- create a complex agent swarm
- overfit a scoring algorithm
- require external courses
- replace Obsidian
- build heavy gamification
- chase perfect UI
- introduce infra without need

---

# 26. Claude Code Operating Instructions

When working in this repo:

1. Treat this document as the product/learning-system source of truth.
2. Keep the in-app baseline immutable: a finished baseline never changes; a checkpoint is a new snapshot.
3. Never mark a skill validated because content was viewed.
4. Prefer runnable evidence over self-reported confidence.
5. Separate competence from confidence.
6. Do not reteach already-solid concepts unless they are prerequisites for a failed skill.
7. Prefer authoritative sources and store source metadata.
8. Do not silently invent facts when a current source should be checked.
9. Keep lessons concise and practical.
10. Each major module should include prediction, implementation, debugging, and explanation.
11. Use automated tests where behavior can be objectively checked.
12. Do not overengineer the platform.
13. Build only enough UI to support the learning loop.
14. Keep learner state durable in files/database.
15. Make generated content inspectable/versionable.
16. Do not let the Tutor and Assessor behave as the same role.
17. Never use the same exact exercise as the assessment unless intentionally measuring retention.
18. Track failed concepts and misconceptions explicitly.
19. Prefer fixing prerequisites over pushing forward blindly.
20. Treat project-derived unknown concepts as knowledge debt.

---

# 27. First Build Task for Claude Code

Start by proposing—not immediately implementing—the v0 architecture.

Deliver:

1. repository structure
2. core data model
3. skill graph schema
4. mastery/evidence schema
5. source metadata schema
6. lesson snapshot schema
7. assessment attempt schema
8. lab structure
9. Planner / Researcher / Tutor / Assessor interfaces
10. minimal UI routes
11. exact MVP scope for Modules 1–3
12. implementation order

Constraints:
- optimize for fast local iteration
- minimal infrastructure
- every major design choice should state why it exists
- distinguish what is needed in v0 vs later
- do not build yet until architecture is reviewed

After architecture approval, implement the smallest vertical slice:

```text
Baseline learner state
→ Planner selects skill
→ Researcher builds source packet
→ Tutor generates/saves lesson
→ learner completes one runnable exercise
→ Assessor evaluates
→ mastery state updates
→ dashboard reflects result
```

The first vertical slice should use **JavaScript Event Loop / Async Mental Models** because it is a common source of misconceptions and objective prediction exercises are easy to validate.

---

# 28. Success Criteria

The system succeeds if, after using it for several weeks, the learner can:

- explain concepts previously known only by API usage
- predict system behavior before running code
- diagnose failures more systematically
- implement patterns without blindly copying AI output
- recognize when infrastructure is or is not justified
- reason about concurrency, failure, retries, and observability
- build AI features with measurable retrieval/evaluation quality
- detect knowledge debt introduced by AI-generated code
- show objective before/after evidence against the in-app baseline

The most important outcome is:

> **The learner should understand the systems they build, not merely be able to produce them with AI.**
