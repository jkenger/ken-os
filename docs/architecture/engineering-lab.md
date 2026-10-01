# Engineering Lab decisions

Status: the Researcher is built and has run once locally. The rest of the v0 architecture (§27 of the handoff) is not yet proposed or approved.

[The handoff](../product/ai-engineering-learning-handoff.md) is the module's source of truth. This file records decisions made while building it, so the handoff and its baseline assessment stay unchanged.

## Decided

- **Engineering Lab is a Ken OS module**, not a separate repo. Ken OS is the umbrella platform. The module reuses the owner sign-in, PostgreSQL with Drizzle, and `packages/agents`. (Owner, 2026-10-01.)
- **Which document wins:** the handoff decides anything inside the module. [The product brief](../product/brief.md) decides platform-wide rules such as owner-only access and approval for external writes.
- **"Topic", not "skill"**, in the UI and in new code, because Ken OS already has an "Agent skills" page. (Owner, 2026-10-01.)
- **Lab code is written in a browser code box** on the topic page. There is no local runner in v0. (Owner, 2026-10-01.)
- **Confidence is rated only on assessment and review answers**, not on lesson practice or lab runs. (Owner, 2026-10-01.)

## Researcher

The Researcher builds a small source packet for one skill: 2 to 5 sources and 5 to 12 short claims, each tied to the page that supports it. A separate Tutor will teach from it later. The Researcher does not teach or grade.

Where it lives:

- `packages/domain/src/engineering-lab.ts`: source tiers, allowed domains, refresh timing, and `finalizeSourcePacket`.
- `packages/agents/src/researcher.ts`: the agent, using the OpenAI web search tool limited to the skill's allowed domains.
- `apps/web/src/features/engineering-lab/research-targets.ts`: the Module 1 skills and the exact gap each one repairs. Provisional until the skill graph schema is approved.
- `apps/web/scripts/research.ts`: saves a packet to `content/engineering-lab/sources/<skill>/<date>.json`.

Run it with:

```bash
pnpm --filter @ken-os/web lab:research js.event_loop
```

Why it is built this way:

- **The model only proposes.** Code checks every source URL against the allowlist (HTTPS only, exact host or subdomain), drops claims that point at a source it did not keep, caps sources at five, and stamps all dates. The model never sets dates or freshness.
- **Rejections stay visible.** Anything dropped is listed in the packet's `rejected` field instead of disappearing.
- **Snapshots are never overwritten**, so a lesson keeps the exact sources it was built from. A second run on the same day fails instead of replacing the file.
- **Refresh timing follows how fast a topic changes:** core concepts 365 days, web platform 180, frameworks 60, AI providers and tools 14.
- **Read-only.** The Researcher reads public pages and writes only to the local repo. Page content is treated as untrusted and the prompt says to ignore instructions inside it. The allowlist check in code is the real guard.

Verified on 2026-10-01: unit tests cover the allowlist, lookalike hosts, plain HTTP, unbacked claims and the source cap. One live run for `js.event_loop` saved 4 sources (three MDN pages and the WHATWG HTML spec) and 8 claims with nothing rejected.

Not yet done: a hosted route or UI, storing packets in the database, and skills beyond Module 1.

## Hosted lab runner (proposal, not decided)

Ken OS runs on Vercel, where a normal request cannot run a lab's test suite. Each lab type has a cheaper fit than one general sandbox:

| Lab type | Runner | Cost |
| --- | --- | --- |
| Predict the output (event loop, closures) | No runner. Compare the answer with a stored expected answer. | Free |
| Small JS exercises | A Web Worker in the browser, with the tests sent alongside | Free |
| HTTP, cookies, CORS, caching | Practice endpoints in Ken OS that set real headers; the browser is the lab | Free |
| Indexes and `EXPLAIN ANALYZE` | PGlite (Postgres compiled to WebAssembly) in the browser | Free, open source |
| Concurrency, races, full Vitest suites | Vercel Sandbox (isolated microVM) | See below |

Vercel Sandbox, checked 2026-10-01 on [the pricing page](https://vercel.com/docs/sandbox/pricing): Hobby includes 5 active CPU hours, 420 GB-hours of memory and 5,000 sandbox creations per month at no charge, with sessions up to 45 minutes. Usage pauses rather than bills when the allowance runs out. Pro charges $0.128 per CPU hour and $0.0212 per GB-hour, and Vercel's own example puts a 2-minute test run at about $0.0018. Personal use should stay inside the Hobby allowance.

PGlite allows only one connection at a time ([docs](https://pglite.dev/docs/)), so it cannot reproduce two buyers racing for the same stock. Race labs need a real Postgres inside a sandbox, or a throwaway database branch.

Considered and not chosen:

- **E2B:** comparable sandboxes, but $100 of one-time credit and then a $150 monthly plan for longer sessions ([pricing](https://e2b.dev/pricing)). Vercel Sandbox is already on the same account.
- **WebContainers (StackBlitz):** runs Node in the browser, but needs a commercial license for production use in a for-profit setting ([terms](https://webcontainers.io/enterprise)). Avoid it unless Ken OS stays strictly personal.

Effort estimate: the browser runners and the expected-answer check are about a day together. Vercel Sandbox integration (create, copy lab files, run tests with a JSON reporter, read the results, stop) is about one to two days, plus a timeout and a cap on runs per day.
