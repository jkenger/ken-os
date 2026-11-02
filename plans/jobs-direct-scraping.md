# Plan: Jobs — Direct scraping (release step 1)

**Branch**: jkenger/Job-Finder-Feat
**Status**: Superseded (2026-11-01) — see `plans/jobs-freehire-source.md`. The LinkedIn/Indeed scrapers and
block/backoff state this plan built are being replaced with the freehire API as the sole source; see that plan's
Scope note for the owner's reasoning and evidence. Kept here for the historical record, not an active plan.

## Goal

LinkedIn and Indeed postings reach `/jobs` within about a minute of appearing on each site, scraped directly from
each site's own guest/app endpoint, polled every minute. This is the only path in: no alert-email fallback. A block
means a gap in that source's postings for up to 24 hours, not degraded speed — the owner accepted that trade for one
mechanism instead of two (docs/product/job-finder.md, "Getting postings in").

## Scope note

This plan covers release step 1 from `docs/product/job-finder.md`: the LinkedIn and Indeed scrapers, their
`/api/jobs/check/<source>` routes, block/backoff state, repeat dropping, the Jobs page with New and Filtered out,
and settings. An earlier version of this plan built a Gmail-forward alert-email pipeline first and kept it as a
fallback when scraping was added; both have been removed (see `docs/product/job-finder.md`'s "Getting postings in"
and "Status" line). This plan does not build the OnlineJobs checker (release step 4) or AI scoring (release step 2);
both are separate, later plans. Registering the actual cron-job.org schedule is an operational step the owner does
outside this codebase once the routes exist; this plan's "done" is the routes working correctly when called, not
the schedule being live.

## Acceptance Criteria

- [ ] A posting scraped from LinkedIn shows on `/jobs` within about a minute of the scrape that found it.
- [ ] A posting scraped from Indeed shows on `/jobs` within about a minute of the scrape that found it.
- [ ] A posting seen from both LinkedIn and Indeed scrapes, in either order, shows once, listing both sources.
- [ ] `/api/jobs/check/linkedin` and `/api/jobs/check/indeed` require `JOBS_CHECK_SECRET`; a call without it, or with
      the wrong value, is rejected and runs nothing.
- [ ] A 403 or 429 from a scrape stops that source for 24 hours; a call made while a source is blocked skips the
      fetch entirely.
- [ ] Settings shows each source's state: Running, or Blocked until a time.
- [ ] Each scraper searches with the owner's roles, read from the same `deriveRoles(profile)` Settings already
      shows, one request per role.
- [ ] Neither scraper signs in or submits anything; both are read-only GET/POST requests to each site's own
      guest or app endpoint.

## Slices

### Slice 1: LinkedIn scraper, check route and block state

**Value**: Behavior change — the owner sees LinkedIn postings on `/jobs` roughly a minute after they're posted, with
no setup beyond a Profile headline, and the full scrape-check-block pipeline exists for the first source.
**Path**: External scheduler (the owner's own cron-job.org job, set up outside this codebase) calls
`/api/jobs/check/linkedin` with `JOBS_CHECK_SECRET` every minute → route checks `job_scraper_state` for an active
`blockedUntil` → if clear, calls LinkedIn's guest search endpoint once per role → parses the returned HTML job cards
into `RawPosting[]` (source ID prefixed `li-<id>`) → `savePostings` (dedup, store, filter) → on 403/429, sets
`blockedUntil` 24 hours out and records state Blocked; on success, records state Running. Settings reads and shows
this state.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing` (scraper tested against a saved sample
LinkedIn guest-search HTML page, per the spec's "parser tests on saved pages" principle), `api-design` for the check
route's auth/error semantics, `typescript-strict`, `functional` for the scraper's extraction logic.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first, fourth, fifth, sixth and eighth unchecked boxes above, scoped to LinkedIn only.
**RED or preservation baseline**: Failing tests, in order: (1) a saved sample LinkedIn guest-search HTML page parses
into the right `RawPosting[]`, with `sourceId` prefixed `li-<id>`; (2) calling the check route with the correct
secret, with the HTTP fetch mocked to return that saved page,
results in those postings in `job_postings`/`job_matches` via the existing `savePostings`; (3) a mocked 403 or 429
response sets `blockedUntil` 24 hours out, records state Blocked, and writes no postings; (4) a call made while
`blockedUntil` is still in the future skips the fetch entirely and makes no request; (5) a call with a missing or
wrong secret is rejected and runs nothing; (6) a successful run records state Running and a `lastRunAt`.
**GREEN or preservation change**: `features/jobs/scrapers/linkedin.ts` (fetch + parse, returns `RawPosting[]`);
`job_scraper_state` table and migration; `features/jobs/scraper-state.ts` (read/write block state, reused by
Slice 2); `/api/jobs/check/linkedin/route.ts`; `JOBS_CHECK_SECRET` in `.env.example`; the Settings page shows
LinkedIn's state.
**REFACTOR**: Assess once GREEN (extract the shared "check a secret, read block state, run, record result" shape so
Slice 2's Indeed route reuses it instead of copying it).
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the scraper's HTML parsing and the block/backoff
state transitions once the slice is otherwise ready — these are the highest-value targets (a silently-wrong 403
check either floods LinkedIn with requests during a block, or stops polling on an unrelated error).
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with this slice's scenarios and passing.

### Slice 2: Indeed scraper, reusing the check-route and block-state pattern

**Value**: Behavior change — proves the scraper pattern generalizes to a second source with a materially different
technique (GraphQL instead of HTML cards), and that a posting scraped from Indeed collapses with the same posting
already seen from a LinkedIn scrape.
**Path**: Same pipeline as Slice 1, with an Indeed scraper (`features/jobs/scrapers/indeed.ts`) posting GraphQL
queries to Indeed's mobile-app endpoint instead of parsing HTML, and a second saved sample response for its tests.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges.
**Required implementation skills**: Same as Slice 1.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the second and third unchecked boxes above.
**RED or preservation baseline**: Failing tests: (1) a saved sample Indeed GraphQL response parses into the right
`RawPosting[]`, with `sourceId` prefixed `in-<key>`; (2) a posting already stored from a LinkedIn scrape, then also
found by the Indeed scrape with a matching title/company/location (no shared source ID), merges into one row
listing both sources instead of creating a second one; (3) the same block/missing-secret/blocked-skip tests as
Slice 1, scoped to Indeed's check route.
**GREEN or preservation change**: `features/jobs/scrapers/indeed.ts`; `/api/jobs/check/indeed/route.ts` built on
Slice 1's shared check-route helper; Settings shows Indeed's state alongside LinkedIn's.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the Indeed scraper's parsing and on the shared
block-state helper now that a second caller exercises it.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm --filter @ken-os/web test:db:jobs` pass.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
