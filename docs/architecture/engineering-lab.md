# Engineering Lab decisions

Status: v0 is live on ken-os-web.vercel.app ([as-built notes](engineering-lab-v0.md#as-built-2026-10-01)). The UI direction is agreed in [engineering-lab-ui.md](engineering-lab-ui.md) and comes first; the next version is proposed in [engineering-lab-v1.md](engineering-lab-v1.md).

[The handoff](../product/ai-engineering-learning-handoff.md) is the module's source of truth. This file records decisions made while building it, so the handoff and its baseline assessment stay unchanged.

## Decided

- **Engineering Lab is a Ken OS module**, not a separate repo. Ken OS is the umbrella platform. The module reuses the owner sign-in, PostgreSQL with Drizzle, and `packages/agents`. (Owner, 2026-10-01.)
- **Which document wins:** the handoff decides anything inside the module. [The product brief](../product/brief.md) decides platform-wide rules such as owner-only access and approval for external writes.
- **"Topic", not "skill"**, in the UI and in new code, because Ken OS already has an "Agent skills" page. (Owner, 2026-10-01.)
- **Lab code is written in a browser code box** on the topic page. There is no local runner in v0. (Owner, 2026-10-01.)
- **Confidence is rated only on assessment and review answers**, not on lesson practice or lab runs. (Owner, 2026-10-01.)
- **No second domain for CORS labs.** The code box's worker has an opaque origin, so its requests to Ken OS are already cross-origin. This closed the last open question in the proposal. (Found during the build, 2026-10-01.)
- **No Vercel Sandbox in v0.** Race labs interleave concurrent calls between queries on PGlite, which reproduces lost updates, check-then-insert races and duplicate creates. A sandbox with real parallel connections is only needed for lock and isolation-level labs, which v0 doesn't have. (Found during the build, 2026-10-01.)
- **A prediction's "why" is saved but not graded.** It has its own box, so it can't be mistaken for a printed line. After answering, the learner sees an explanation the Tutor or Assessor wrote with the question (`tutor-v2`, `assessor-v2`) and compares it themselves, so there's no extra AI call. Older lessons and questions have no explanation. (First live test, 2026-10-02.)
- **A practice prediction locks once it's right.** Retrying after a wrong answer is still allowed. Assessment questions already allowed one answer each. (First live test, 2026-10-02.)

## Researcher

The Researcher builds a small source packet for one topic: 2 to 5 sources and 5 to 12 short claims, each tied to the page that supports it. The Tutor teaches from it. The Researcher does not teach or grade.

Where it lives:

- `packages/domain/src/engineering-lab/sources.ts`: source tiers, allowed domains, refresh timing, and `finalizeSourcePacket`.
- `packages/agents/src/engineering-lab/researcher.ts`: the agent, using the OpenAI web search tool limited to the topic's allowed domains.
- The topic map (`content/engineering-lab/curriculum/topics.yaml`) gives each topic its gap and source groups.
- In the app, writing a lesson researches the topic first whenever its newest packet is past its refresh date, and stores the packet in `lab_source_packets`.
- `apps/web/scripts/research.ts` saves a packet to `content/engineering-lab/sources/<topic>/<date>.json` from the command line; `lab:import-sources` loads saved packets into the database.

```bash
pnpm --filter @ken-os/web lab:research js.event_loop
```

Why it is built this way:

- **The model only proposes.** Code checks every source URL against the allowlist (HTTPS only, exact host or subdomain), drops claims that point at a source it did not keep, caps sources at five, and stamps all dates. The model never sets dates or freshness.
- **Rejections stay visible.** Anything dropped is listed in the packet's `rejected` field instead of disappearing.
- **Snapshots are never overwritten**, so a lesson keeps the exact sources it was built from. The first packet file still says `skillId`; the importer reads both names rather than rewriting it.
- **Refresh timing follows how fast a topic changes:** core concepts 365 days, web platform 180, frameworks 60, AI providers and tools 14.
- **Read-only.** The Researcher reads public pages and writes only its own packet. Page content is treated as untrusted and the prompt says to ignore instructions inside it. The allowlist check in code is the real guard.

## Lab runners

Ken OS runs on Vercel, where a normal request cannot run a lab's tests. Every v0 lab runs in the learner's browser instead, for free.

| Lab type | Runner | Used for |
| --- | --- | --- |
| Predict the output | The snippet runs in a Web Worker; its real output is the answer key | Module 1 practice and Assessor questions |
| JavaScript exercises | A Web Worker started from a `data:` URL, with the lab's tests | Module 1 labs |
| HTTP, cookies, CORS, caching | Probes: the page makes real requests to anonymous, data-free practice endpoints and records what happened | Module 2 labs |
| Databases | PGlite (Postgres compiled to WebAssembly) inside the same worker, from a pinned CDN build | Module 3 labs |

The `data:` URL matters: it gives the worker an opaque origin, so lab code can't send the owner's cookies or pass the API's origin check, and `terminate()` stops infinite loops.

Considered for later and not needed yet:

- **Vercel Sandbox**, for labs needing real parallel connections. Checked 2026-10-01 on [the pricing page](https://vercel.com/docs/sandbox/pricing): Hobby includes 5 active CPU hours, 420 GB-hours of memory and 5,000 sandbox creations per month at no charge, and pauses rather than bills past that. Vercel's example puts a 2-minute test run at about $0.0018 on Pro.
- **E2B:** comparable, but $100 of one-time credit and then a $150 monthly plan for longer sessions ([pricing](https://e2b.dev/pricing)).
- **WebContainers (StackBlitz):** needs a commercial license for production use in a for-profit setting ([terms](https://webcontainers.io/enterprise)).
