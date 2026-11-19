# Jobs: per-source scraper status (mockup brief)

Status: lightweight brief, 19 Nov 2026 -- no canvas drawn. Plan: [jobs-scraper-sources.md](../../plans/jobs-scraper-sources.md), Slice 3.

**Why lightweight, not a full canvas exploration.** This isn't a new screen: `overview.tsx`'s `SetupStatusPanel`
already renders one `StatusRow` per fact (Roles, Preferences, Last checked), each with an icon, a state word and
a caption, using `CheckStatusIcon`'s existing `never`/`working`/`late`/`failing` vocabulary
(`docs/mockups/jobs-redesign-canvas/Last-checked.dc.html`). This slice only changes _how many_ "Last checked"-style
rows exist (one per scraped source instead of one combined fact) and reuses that same row shape and icon
vocabulary unchanged. A new row repeated N times doesn't need a new visual design pass the way an actual new
screen or component would.

## States to show

Each scraped source (LinkedIn, Indeed, JobStreet -- read generically from `job_scraper_state`, not a hardcoded
list, since sources land one slice at a time) gets its own `StatusRow`, same layout as today's single "Last
checked" row, with its own icon:

1. **Running** -- the source's last call succeeded and didn't trip a block. Icon: `CircleCheck` (same as
   `working` today). State word: "Running". Caption: when it last ran ("Last ran 3m ago"), or nothing if it's
   never run yet but also never blocked (shouldn't happen in practice -- a source is either never-run or has run
   at least once).
2. **Blocked until \<time\>** -- a 403/429 set a 24h backoff for that source. Icon: `Clock` (same as `late`
   today -- "not actively running right now" reads the same whether the cause is scheduler silence or a
   deliberate block). State word: "Blocked". Caption: "Blocked until Nov 20, 3:14 PM" (or similar local-time
   format), so the owner knows when it'll try again, not just that it's stuck.
3. **Never run** -- no `job_scraper_state` row exists yet for that source (the scheduler's never called its check
   route). Icon: `CircleDashed` (same as `never` today). State word: "Never". Caption: same wording freehire's
   own never-run caption uses today, naming the specific source's check route instead of freehire's.

freehire keeps its own existing row exactly as today (`working`/`failing`/`late`/`never`, per-account
`jobCheckStatus`) -- it has no block/backoff concept, so it's not folded into this generic per-source list.

## What's real and what needs building

- `job_scraper_state` (Slice 1) already has `source`/`blocked`/`blockedUntil`/`lastRunAt` -- confirmed live
  against local Postgres, rows exist for `"linkedin"` after Slice 1.
- Needs building: a read of every row (`getAllScraperStates`), a pure view function analogous to
  `describeCheckStatus` (`describeScraperState`), and `SetupStatusPanel` mapping over the result instead of
  showing one hardcoded row.
