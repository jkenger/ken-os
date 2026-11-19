# Plan: Jobs — LinkedIn, Indeed and JobStreet as direct sources alongside freehire

**Branch**: docs/jobs-scraper-sources-plan (this plan only; implementation slices each get their own branch per
Hard architecture branch rules)
**Status**: Draft, not started

## Goal

Postings from LinkedIn, Indeed, and JobStreet reach `/jobs` the same way freehire's already do today — polled by
an outside scheduler, searched per account for that account's own roles, deduped against whatever freehire already
found — closing the gap the owner is currently filling by checking those three sites by hand.

## Scope note

**This reverses a decision made on 2026-11-01** (`plans/jobs-freehire-source.md`): LinkedIn and Indeed scrapers
existed before, were deleted, and freehire became the sole source specifically to stop paying the anti-bot/
maintenance cost of hand-rolled scrapers. That reasoning hasn't changed — LinkedIn and Indeed still 403/429 block
guest traffic — but the owner has decided the coverage gap (freehire's 421 sources are mostly ATS platforms, not
LinkedIn/Indeed/JobStreet themselves) is now worth paying that cost again for. Reverting it a second time, if the
maintenance burden repeats, should go through the same kind of explicit decision, not a silent rewrite.

**Endpoints are reverse-engineered from speedyapply/JobSpy** (MIT, 4.7k stars, actively maintained), not
reinvented — this project's own now-deleted LinkedIn/Indeed scrapers already used the same two endpoints JobSpy
does, which cross-confirms the approach rather than replacing it:

- **LinkedIn**: `GET linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search` — signed-out guest endpoint,
  HTML job cards, 10 results/page via `start` offset, static desktop User-Agent, no auth.
- **Indeed**: `POST apis.indeed.com/graphql` — the public mobile app's own endpoint and static API key (baked
  into the published app, not per-account), cursor-paginated, 100 results/page.
- **JobStreet** (new territory — the old plan never covered it): `GET au.seek.com/api/jobsearch/v5/search` with
  `siteKey=PH-Main` (confirmed against the PH market), details via a batched GraphQL call at `au.seek.com/graphql`.
  JobSpy's own code uses `curl_cffi` with `impersonate="chrome"` for this site, which earlier research took as a
  hard TLS-fingerprint requirement — **live-tested 2026-11-19 and that's only partly true**: a plain `curl` with
  just a desktop User-Agent got a clean `200` from both the search endpoint and a trivial GraphQL probe
  (`{ __typename }`), no impersonation needed. The public HTML job page (`ph.jobstreet.com/job/<id>`) does `403`
  on a plain request — that's the part that's actually blocked. Slice 4 should test the _real_ batched
  job-details GraphQL query (actual fields, multiple IDs aliased) against a plain Node HTTP client first; only
  reach for a TLS-impersonation library if that specific query gets blocked under real use, not on the assumption
  JobSpy's defensive choice is load-bearing here.

**Gap-check spike, run live 2026-11-19 — JobStreet is worth building.** `job-boards.ts`'s `KNOWN_BOARDS` already
lists `jobstreet` as one of freehire's own confirmed `source` values, so the question was how thin that slice
actually is. Queried both freehire (`source=jobstreet` filter) and SEEK's own search endpoint
(`siteKey=PH-Main`) directly for the same three PH-remote role keywords:

| Keyword             | freehire's `jobstreet`-sourced total | SEEK's own `totalCount` | Coverage |
| ------------------- | ------------------------------------ | ----------------------- | -------- |
| full-stack engineer | 568                                  | 4,075                   | ~14%     |
| react developer     | 150                                  | 964                     | ~16%     |
| frontend engineer   | 143                                  | 799                     | ~18%     |

freehire surfaces roughly one in six of what JobStreet itself has for the same search. **Freshness is worse than
volume**: sorted by newest, SEEK's top result for "full-stack engineer" was listed 2026-11-19T03:19:49Z (minutes
old at query time); freehire's freshest `jobstreet`-sourced result for the same keyword was posted
2026-11-17T05:33:23Z — over two days stale. That's the owner's exact complaint ("doesn't catch new listing")
confirmed directly, not inferred. Slice 4 proceeds.

**No proxy support in any slice.** Reverse-engineering JobSpy's own proxy handling (`plans/jobs-direct-scraping.md`
superseded this same question once already) showed proxy usage is optional hardening, not load-bearing — JobSpy
itself runs unproxied by default for all three sites, and the live spike above confirms SEEK's own API accepts
plain unproxied requests too (see JobStreet endpoint note above). JobSpy only names proxies as a fix for
JobStreet's GraphQL _details_ call hitting a `RATE_LIMITED` error specifically, at volume this project's
single-account-at-a-time search pattern is unlikely to reach. Revisit only if that specific rate limit shows up
in practice; building proxy rotation against a problem that hasn't happened yet is exactly the kind of
flexibility nobody's asked for.

**Block/backoff state is global per source, not per account.** `job_scraper_state` (deleted in the freehire
migration) comes back, but scoped to `source` alone — every account's search for a given source shares the same
server IP, so a block triggered by one account's keyword search blocks every other account's calls to that source
too, regardless of what a per-account state would say. Getting this wrong (per-account blocking) would mean
accounts keep hammering an already-blocked source on the mistaken belief their own state is clear.

**Shared scraper contract, built once, not deferred.** The old plan deferred extracting a shared "check a secret,
read block state, run, record result" shape to a REFACTOR step that never happened before both scrapers were
deleted. This time three sources are known upfront (LinkedIn, Indeed, JobStreet), so Slice 1 builds the shared
contract directly instead of copy-pasting three check-routes and assessing later.

**Per-source status needs a mockup before it's built.** Today's "Last checked" row (`overview.tsx`'s
`SetupStatusPanel`) shows one fact for one source (freehire). Three sources with independent Running/Blocked
states is a new visual state this project hasn't shown before — per this repo's mockup convention
(`docs/mockups/README.md`), Slice 3 needs a drawn brief before implementation, not a judgment call made in JSX.

## Non-goals

- No proxy support (see above) — revisit only if JobStreet's rate limiter is hit in production.
- No third-party unblocking/CAPTCHA-solving service.
- No change to freehire's own pipeline — this adds sources alongside it, doesn't touch `checkFreehire`/
  `scrapeFreehireForUser`.
- No Glassdoor/ZipRecruiter/other JobSpy-covered sites — out of scope, not asked for.

## Acceptance Criteria

- [ ] A posting scraped from LinkedIn shows on `/jobs` within about a minute of the scrape that found it, for
      every account with saved Jobs preferences.
- [ ] A posting scraped from Indeed shows on `/jobs` within about a minute of the scrape that found it.
- [ ] A posting already saved from freehire (or any other source) that's also found by a LinkedIn/Indeed/JobStreet
      scrape, in any order, shows once, listing every source that found it.
- [ ] `/api/jobs/check/linkedin`, `/api/jobs/check/indeed`, and (if Slice 4 proceeds) `/api/jobs/check/jobstreet`
      each require `JOBS_CHECK_SECRET`; a call without it, or with the wrong value, is rejected and runs nothing.
- [ ] A 403/429 from a source stops that source for every account for 24 hours; a call made while a source is
      blocked skips the fetch entirely, for every account.
- [ ] The Jobs Overview shows each source's own state (Running, or Blocked until a time), not just one combined
      "Last checked" fact.
- [ ] Neither scraper signs in or submits anything; each is a read-only request to the site's own guest/app/public
      endpoint.

## Slices

### Slice 1: Shared scraper contract, block/backoff state, and LinkedIn as the first source

**Value**: Behavior change — the owner sees LinkedIn postings on `/jobs` roughly a minute after they're posted,
across every account with saved Jobs preferences, and the shared block-state/check-route shape exists for Slices
2 and 4 to reuse instead of copying.
**Path**: `features/jobs/scraper-contract.ts` defines the shared shape (a function taking a keyword, returning
`RawPosting[]`, plus a block-detector) and a generic `checkScraperSource` helper (reads global `blockedUntil` for
that source, skips the fetch if blocked, runs one search per account per role via `listUsersWithPreferences`/
`deriveRoles` same as `scrapeFreehireForUser`, records Running/Blocked via a revived `job_scraper_state` table
keyed by `source` alone). `features/jobs/scrapers/linkedin.ts` implements the LinkedIn side (fetch + HTML parse,
`RawPosting.sourceId` prefixed `li-<id>`). `/api/jobs/check/linkedin/route.ts`, modeled on
`check/freehire/route.ts`. `raw-posting.ts`'s `AlertSource` comment updated — `linkedin` is live again, not just
historical. `pipeline.ts` gains `scrapeLinkedInForUser`. `words.ts`'s `sourceWords` already has a `linkedin` entry
(unchanged).
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing` (parser tested against a saved real sample
LinkedIn guest-search HTML page, same bar as freehire's fixture), `api-design` for the check route's auth/error
semantics, `typescript-strict`, `functional` for the extraction logic.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first, fourth (LinkedIn only), fifth, and seventh unchecked boxes above.
**RED or preservation baseline**: Failing tests, in order: (1) a saved sample LinkedIn guest-search HTML page
parses into the right `RawPosting[]`, `sourceId` prefixed `li-<id>`; (2) `checkScraperSource` with a correct
secret runs one search per account per role and saves what it finds via the existing `savePostings`; (3) a mocked
403/429 sets global `blockedUntil` 24 hours out for that `source`, records state Blocked, writes no postings, and
a second account's call in the same window is also skipped without a fetch; (4) a call made while `blockedUntil`
is in the future skips the fetch entirely; (5) a missing/wrong secret is rejected and runs nothing; (6) a
successful run records state Running and `lastRunAt` for that source.
**GREEN or preservation change**: `scraper-contract.ts`, `scrapers/linkedin.ts`, `job_scraper_state` table +
migration (keyed by `source`, no `userId` column), `check/linkedin/route.ts`, `pipeline.ts`'s
`scrapeLinkedInForUser`, `JOBS_CHECK_SECRET` reused (already exists).
**REFACTOR**: Assess once GREEN — confirm `checkScraperSource` genuinely has no LinkedIn-specific assumptions
baked in before Slice 2 reuses it.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the HTML parsing and the block/backoff state
transitions — a silently-wrong 403 check either floods LinkedIn with requests during a block, or stops polling
every account on an unrelated error.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended and passing.

### Slice 2: Indeed, reusing the shared contract

**Value**: Behavior change — proves the Slice 1 contract generalizes to a second source with a materially
different technique (GraphQL instead of HTML cards), and that a posting found by both LinkedIn and Indeed (or
either plus freehire) collapses into one row.
**Path**: `scrapers/indeed.ts` (static mobile-app API key + GraphQL query, cursor pagination) built on Slice 1's
`checkScraperSource`. `/api/jobs/check/indeed/route.ts`. `pipeline.ts`'s `scrapeIndeedForUser`.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges.
**Required implementation skills**: Same as Slice 1.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the second, third, fourth (Indeed), and fifth unchecked boxes above.
**RED or preservation baseline**: Failing tests: (1) a saved real sample Indeed GraphQL response parses into the
right `RawPosting[]`, `sourceId` prefixed `in-<id>`; (2) a posting already stored from LinkedIn or freehire, also
found by the Indeed scrape with a matching title/company/location, merges into one row listing every source
instead of creating a second one; (3) the same block/missing-secret/blocked-skip tests as Slice 1, scoped to
Indeed.
**GREEN or preservation change**: `scrapers/indeed.ts`, `check/indeed/route.ts`, `pipeline.ts`'s
`scrapeIndeedForUser`.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the Indeed parser and on the shared contract now
that a second caller exercises it.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm --filter @ken-os/web test:db:jobs` pass.

### Slice 3: Per-source status on the Jobs Overview

**Value**: Behavior change — the owner can tell _which_ source is blocked instead of one combined "Last checked"
fact going vague when any one of four sources has a problem.
**Path**: A mockup brief (`docs/mockups/jobs-overview-per-source-status.md` or similar, following
`docs/mockups/README.md`'s convention) comes first, drawing the states: all sources Running, one Blocked with a
time, a source that's never run. Implementation follows the chosen mockup — `SetupStatusPanel`'s "Last checked"
row becomes one row per source (freehire/LinkedIn/Indeed/JobStreet), reading `job_scraper_state` for the three
scraped sources and the existing `jobCheckStatus` row for freehire.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 2 merges.
**Required implementation skills**: mockup brief first (host canvas/artifact tool), then
`mattpocock-skills:tdd`, `react-testing`, `typescript-strict`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the sixth unchecked box above.
**RED or preservation baseline**: Failing test: the Overview renders one status row per active source, each
showing Running or "Blocked until <time>" independently, sourced from `job_scraper_state`/`jobCheckStatus`
rather than one shared fact.
**GREEN or preservation change**: `overview.tsx`'s `SetupStatusPanel`, a query joining the per-source state rows.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Not security/money-critical; a focused test per state (Running/
Blocked/Never) is enough without a full mutation pass.
**Done when**: `pnpm check`, `pnpm test`, `pnpm build` pass; mockup states all represented in the real UI.

### Slice 4: JobStreet

**Value**: Behavior change — closes the JobStreet gap directly. Confirmed live 2026-11-19 (see Scope note's
gap-check spike): freehire's own `jobstreet` source covers roughly one in six of what JobStreet itself has for
the owner's roles, and even that slice runs 2+ days stale at the fresh end — the exact "missing new listings"
complaint this plan exists to fix.
**Path**: Start by testing the real batched job-details GraphQL query (actual fields, multiple job IDs aliased)
against a plain Node HTTP client — the spike's trivial probe worked unimpersonated, but the real query's
behavior under real field selections is unverified. If that plain call gets blocked, run
`evaluate-existing-solutions` to pick a TLS-impersonation-capable HTTP client for Node before going further
(JobSpy's Python `curl_cffi` has no direct TS equivalent in this project yet). Then `scrapers/jobstreet.ts`
(SEEK's `jobsearch/v5/search`, `siteKey=PH-Main`, GraphQL details batch at `au.seek.com/graphql`) built on
Slice 1's `checkScraperSource`. `/api/jobs/check/jobstreet/route.ts`. `AlertSource` gains `"jobstreet"`;
`words.ts`'s `sourceWords` gains an entry.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 3 merges (status UI should already show a per-source
shape before a fourth source needs to fit into it).
**Required implementation skills**: `evaluate-existing-solutions` only if the plain-client test fails, then same
as Slice 1.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the remaining JobStreet-scoped boxes above.
**RED or preservation baseline**: Failing tests: (1) a saved real sample SEEK search response parses into the
right `RawPosting[]`, `sourceId` prefixed `js-<id>`; (2) the search and details requests succeed against SEEK's
real endpoints using a plain Node HTTP client — only add a TLS-impersonation client, with its own test proving a
plain call fails first, if that turns out to be necessary; (3) the same block/missing-secret/blocked-skip tests
as Slice 1, scoped to JobStreet.
**GREEN or preservation change**: `scrapers/jobstreet.ts`, `check/jobstreet/route.ts`, `AlertSource`/`words.ts`
additions, a TLS-client dependency only if the plain-client test in (2) actually fails.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the SEEK parser and block state.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm --filter @ken-os/web test:db:jobs` pass; live-verify a real PH JobStreet posting reaches `/jobs`.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
