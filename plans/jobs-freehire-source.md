# Plan: Jobs — Replace LinkedIn/Indeed/WWR sourcing with freehire

**Branch**: jkenger/Job-Finder-Feat
**Status**: Active

## Goal

Every posting on `/jobs` comes from [freehire](https://github.com/strelov1/freehire) instead of hand-built
LinkedIn/Indeed scrapers, and the owner's Countries/Work setup/Job type filters trust freehire's own structured
data instead of asking an AI model to re-derive what the source already states plainly.

## Scope note

This plan supersedes `plans/jobs-direct-scraping.md` (LinkedIn/Indeed) and Slice 3 of
`plans/jobs-filters-and-wwr-source.md` (We Work Remotely, never shipped past an in-progress scraper). The owner's
decision, verbatim: _"yes pull everyhing through freehire. it's open source so I don't think dependency is not a
big deal."_ Full replacement, not a fourth source alongside LinkedIn/Indeed. Effort freed from building and
maintaining scrapers goes to CV tailoring and smart matching — separate, later work, out of scope here.

**Why freehire, not a third hand-built scraper.** Verified live this session, not taken on faith from its README:

- The repo is real and active — 3,413 stars, 354 forks, MIT license, pushed the same day it was found
  (`gh api repos/strelov1/freehire`).
- `GET https://freehire.me/api/v1/jobs/search` is genuinely public and keyless — queried live with
  `q`, `countries`, `work_mode`, `limit` and got real, correctly-filtered results back (165 remote,
  Philippines-eligible "frontend engineer" postings from one call).
- 4.78M+ open postings across 421 sources, 160 of them real ATS platforms (Workday, Greenhouse, Lever, iCIMS) —
  structurally more reliable than guest-scraping LinkedIn's HTML or Indeed's mobile API, both of which this
  project has had to build 403/429 block-detection and 24h backoff for.
- Every posting already carries a full HTML `description` inline — no separate per-posting full-page fetch the
  way LinkedIn/Indeed/the planned WWR scraper all needed.
- `countries` is a structured, ISO-coded array (lowercase, e.g. `["ph"]`), confirmed empty-when-unstated (not
  guessed) by sampling 10 real remote postings directly — this is the exact signal `eligibilityStated`/`countries`
  in `extract.ts` has been trying to get an AI model to read out of free text since Slice 1 of the superseded
  plan. `work_mode` (`remote`/`onsite`/`hybrid`) maps directly onto this project's `workSetup` enum.
- `enrichment` (present on most but not all postings, confirmed by sampling) can include `salary_min`,
  `salary_max`, `salary_currency`, `salary_period`, `seniority`, `experience_years_min`, `employment_type`, and
  sometimes its own `summary` — all fields this project's own AI extraction step currently derives from prose.

**Why three slices, not one.** Slice 1 is the minimum safe replacement: freehire's postings flow through the
_existing_ AI extraction unchanged (its `description` text takes the place of LinkedIn/Indeed's full-page-read
text), so the owner's Jobs list improves immediately (better sources, no more block/backoff gaps) without betting
correctness on a same-PR reinterpretation of every filter field. Slices 2 and 3 then retire AI judgment for fields
freehire already states structurally, in order of how much `eligibilityStated`/`countries` (Country filter) and
pay (Minimum/Maximum pay filter) actually matter to what gets hidden today — each is independently a real
accuracy improvement, not plumbing with no observable effect.

**What gets deleted in Slice 1, and why it's safe.** We Work Remotely's in-progress scraper
(`scrapers/weworkremotely.ts`, its test, its real-sample fixture) never shipped — no `job_postings` row anywhere
has `source = 'weworkremotely'`, so deleting it loses no data. LinkedIn and Indeed _did_ ship and existing rows
reference `source IN ('linkedin', 'indeed')` — `AlertSource` keeps those two values for backward-compatible
display of historical postings, but nothing saves them going forward, and every active scraping/block-tracking
code path for them is removed: `scrapers/linkedin.ts`, `scrapers/indeed.ts`, `check-linkedin.ts`, `check-indeed.ts`,
`check-source.ts` (the per-keyword block-detection loop — freehire needs no such thing; it's a cooperative, public,
unauthenticated API, not a site actively trying to stop scraping), `scraper-state.ts` and the `job_scraper_state`
table, and `read-posting.ts` (no per-source full-page fetch exists anymore once every active source gives a full
description inline). `job_postings.stated_location` and `RawPosting.statedLocation` — built this session for
WWR's text hint — are also removed in Slice 1 and not reused: freehire's `countries` doesn't need AI
interpretation the way WWR's free-text region did, so Slice 2 sets fields directly from structured data rather
than passing a hint into `extract()`. The Settings page's Sources section (currently LinkedIn/Indeed
Running/Blocked badges) is replaced with a single static "freehire" line — the Run pipeline button and console
built earlier this session already shows what happened on the last manual run, making per-source block-state
tracking redundant.

**Rate limiting.** No documented limit found in freehire's README or API docs; the public endpoint is unauthenticated
with no stated quota. `dev-with-poll.ts` keeps the existing 60s interval as a starting assumption, verified live in
Slice 1's Done-when, and every fetch path treats a non-200/network error as "skip this cycle, try again next poll"
(logged, not escalated to a block/backoff state) — there is nothing to back off from on a cooperative API, but a
transient failure still shouldn't crash the poll loop.

## Acceptance Criteria

- [ ] A posting on `/jobs` was sourced from freehire's `/api/v1/jobs/search`, not LinkedIn, Indeed, or WWR; no
      active code path scrapes any of those three anymore.
- [ ] A posting whose freehire record states specific countries is filtered for Country using that list directly,
      not an AI model's re-reading of the same posting's prose.
- [ ] A posting whose freehire record states `work_mode` or `employment_type` is filtered for Work setup/Job type
      using those values directly.
- [ ] A posting whose freehire `enrichment` states a salary is checked against Minimum/Maximum pay using that
      value directly, converted the same way an AI-extracted figure already is; one that doesn't falls back to AI
      extraction exactly as before.

## Slices

### Slice 1: Freehire replaces LinkedIn/Indeed/WWR as the only active source

**Value**: Behavior change — the owner's `/jobs` list is populated by polling freehire's public search API instead
of scraping LinkedIn and Indeed (and instead of finishing the in-progress WWR scraper). Same observable shape
(New/Filtered out, Show anyway, Settings), immediately better underlying data (4.78M postings across 421 sources,
including real ATS platforms, vs. two guest-scraped sites prone to 403/429 blocks), and the owner stops carrying
scraper maintenance burden.
**Path**: New `apps/web/src/features/jobs/scrapers/freehire.ts` — `freehireSearchUrl(keyword, postedWithinDays,
limit)` building a `/api/v1/jobs/search?q=...&posted_within_days=...&limit=...` URL, and
`parseFreehireSearch(responseText): RawPosting[]` mapping each result to `{ source: "freehire", sourceId:
"fh-<public_slug>", title, company, location, snippet: <plain-text description>, link }` (same two-pass HTML decode
pattern already proven this session in `scrapers/weworkremotely.ts`), never throwing on malformed JSON (matches
`parseIndeedSearch`'s convention). New `apps/web/src/features/jobs/check-freehire.ts`: one HTTP call per owner role
(`deriveRoles`, same source as today), no block-detection loop (`checkSource`/`check-source.ts` deleted) — a
non-200 or parse failure is logged and skipped for that role this cycle, not escalated to a block state. New
`apps/web/src/app/api/jobs/check/freehire/route.ts`, modeled on the deleted `check/indeed/route.ts` (secret header,
owner lookup via `OWNER_EMAIL`, `deriveRoles(profile)` for keywords). `process.ts` drops its `readFullPosting`
parameter entirely — every freehire posting already carries a full description at save time, so `fullDescription =
posting.snippet` always and `partial = !posting.snippet`, the same shape the now-deleted WWR skip-fetch branch
used, just unconditional. `raw-posting.ts`'s `AlertSource` becomes `"linkedin" | "indeed" | "freehire"` (keeps the
first two only for reading/displaying historical rows; nothing saves them again) — `statedLocation` is removed
from `RawPosting`/`job_postings`/`PendingPosting`/`process.ts`'s extract-input (migration drops the column).
Deleted outright: `scrapers/{linkedin,indeed,weworkremotely}.ts` + their tests + fixtures,
`check-{linkedin,indeed}.ts` + tests, `check-source.ts`, `scraper-state.ts`, `read-posting.ts` + test,
`api/jobs/check/{linkedin,indeed}/route.ts`, `job_scraper_state` table (migration), `job_postings.stated_location`
column (migration). `words.ts`'s `sourceWords` gains `freehire: "freehire"`, keeps `linkedin`/`indeed` labels for
historical display. `settings-page.tsx`'s Sources section becomes a single static "freehire" row, no
Running/Blocked badge (`ScraperState` import and the `linkedInState`/`indeedState` props removed from
`settings/page.tsx`). `dev-with-poll.ts`'s `poll()` hits `/api/jobs/check/freehire` then `/api/jobs/process`,
dropping the two-source `Promise.all`.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict` for the `AlertSource`
narrowing and schema/migration changes, `api-design` for the no-block-detection check route.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first unchecked box above.
**RED or preservation baseline**: Failing tests, in order: (1) `parseFreehireSearch` on a saved _real_ sample
response (a genuine live capture from `/api/v1/jobs/search` this session, not a guessed fixture — same bar as the
WWR RSS fixture) extracts every result with title/company/location/link, a `fh`-prefixed `sourceId`, and a
plain-text `snippet` decoded from the HTML description; (2) a malformed/empty response parses to `[]`, never
thrown; (3) `checkFreehire` with a correct secret fetches one search per role and saves what it finds; (4) a wrong
secret is rejected, nothing fetched; (5) a non-200 response is skipped for that role without recording a block
state (no `isBlocked`/`recordBlocked` params exist on `checkFreehire` at all); (6) `processPostings` with no
`readFullPosting` dependency sets `fullDescription`/`partial` straight from the pending posting's own snippet,
never Partial when a snippet exists.
**GREEN or preservation change**: `scrapers/freehire.ts`, `check-freehire.ts`, `check/freehire/route.ts`,
`process.ts`'s simplified read path, the `AlertSource`/schema/migration changes, `words.ts`, `settings-page.tsx` +
`settings/page.tsx`, `dev-with-poll.ts`, plus every deletion listed in Path.
**REFACTOR**: Assess once GREEN — in particular whether `store.ts`'s `savePostings`/`getPendingPostings` need any
change at all (expected: no, they're already source-agnostic).
**PRE-PR MUTATION or alternate evidence**: Mutation testing on `parseFreehireSearch`'s field mapping and the
`fullDescription`/`partial` simplification — a silently wrong mapping either drops real postings or marks every
posting Partial when none should be.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` updated for the new source and passing; live-verify against the
real freehire API (confirm real postings for the owner's actual roles arrive on `/jobs`, confirm the 60s poll
interval behaves reasonably against the live endpoint — no sustained errors, no unexpectedly large responses).

### Slice 2: Country, Work setup, and Job type filter on freehire's own structured fields

**Value**: Behavior change — a posting whose freehire record states specific countries, a work mode, or an
employment type is filtered using that data directly, not an AI model's re-reading of the same posting's prose.
Removes a whole class of possible AI misreads for the three filters that most directly decide what the owner sees
(Country, Work setup, Job type), for every posting where freehire already has the answer.
**Path**: `process.ts` gains a pre-extraction step for a freehire-sourced pending posting: when
`posting.countries` (the raw freehire field, threaded through the same way `location`/`snippet` already are) is
non-empty, set `eligibilityStated: true` and `countries: posting.countries.map(c => c.toUpperCase())` directly,
skipping whatever `extract()` would have inferred for those two fields; empty stays exactly as today's "not
stated, never filtered" (matches the already-reverted Slice 1 policy in `jobs-filters-and-wwr-source.md`). Same
pattern for `work_mode` → `workSetup` (`remote`/`onsite`/`hybrid` map onto the existing enum, `onsite` → `on_site`)
and `enrichment.employment_type` → `jobType`, each only overriding when freehire actually states it, falling back
to AI extraction otherwise (unchanged behavior for a posting freehire doesn't label). `extract()`'s own prompt
stops being asked to derive these three fields for a freehire posting that already supplies them — still asked
for any posting where freehire's fields are empty, so coverage doesn't regress for sparsely-labeled postings.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the second and third unchecked boxes above.
**RED or preservation baseline**: Failing tests: (1) a freehire posting with `countries: ["ph"]` saves
`eligibilityStated: true, countries: ["PH"]` regardless of what the injected `extract` fake returns; (2) a freehire
posting with `countries: []` leaves `eligibilityStated`/`countries` exactly as `extract()` returned them
(preserves AI-derived behavior when freehire states nothing); (3) `work_mode: "remote"` saves `workSetup: "remote"`
directly; `work_mode: "onsite"` saves `"on_site"`; a posting with no `work_mode` falls back to `extract()`'s
answer; (4) `enrichment.employment_type` present saves `jobType` directly; absent falls back to `extract()`.
**GREEN or preservation change**: `process.ts`'s deterministic-field-override step, `PendingPosting`/`store.ts`
threading freehire's raw `countries`/`work_mode`/`employment_type` fields alongside `location`/`snippet`.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the three override/fallback branches (country,
work setup, job type) — a silently wrong fallback condition either ignores freehire's real data or wrongly
overrides an AI-derived field freehire never actually stated.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with a real freehire posting carrying `countries`/
`work_mode`/`employment_type` and confirming the saved posting reflects them without an AI call being trusted for
those fields; live-verify (confirm a real PH-labeled freehire posting is never filtered for Country regardless of
what any AI extraction would have said).

### Slice 3: Minimum/Maximum pay and seniority filter on freehire's enrichment salary fields

**Value**: Behavior change — a posting whose freehire `enrichment` already states a parsed salary is checked
against Minimum/Maximum pay using that figure directly, the same currency-conversion path already-extracted pay
goes through, instead of asking an AI model to re-read the same number out of prose. A posting without
`enrichment` salary fields falls back to AI extraction exactly as it does today — no coverage loss, only an
accuracy gain where freehire already did the work.
**Path**: `process.ts`'s pre-extraction override extends to `enrichment.salary_min`/`salary_max`/
`salary_currency`/`salary_period` → `payAmount` (midpoint of min/max when both present, matching `extract.ts`'s
existing range-to-midpoint rule for AI-derived pay), `payCurrency`, `payPeriod`, only when freehire states a
salary at all; absent falls back to `extract()` unchanged. `enrichment.seniority`/`experience_years_min` map onto
`seniority`/`yearsRequired` the same way, same fallback rule.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 2 merges.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the fourth unchecked box above.
**RED or preservation baseline**: Failing tests: (1) a freehire posting with `enrichment.salary_min`/`salary_max`
set saves `payAmount` as their midpoint, `payCurrency`/`payPeriod` from `enrichment`, regardless of what the
injected `extract` fake returns; (2) a posting with no salary enrichment leaves pay fields exactly as `extract()`
returned them; (3) the midpoint rule matches `extract.ts`'s existing documented behavior for a stated range; (4)
`enrichment.seniority`/`experience_years_min`, when present, override `extract()`'s answer the same way; absent,
fall back.
**GREEN or preservation change**: `process.ts`'s extended override step; `PendingPosting`/`store.ts` threading the
relevant `enrichment` fields alongside the Slice 2 ones.
**REFACTOR**: Assess once GREEN — in particular whether Slices 2 and 3's override logic should collapse into one
shared "apply freehire's structured fields, fall back to extract() per-field" helper rather than two similar but
separate blocks.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the midpoint calculation and the per-field
fallback conditions — a silently wrong midpoint or fallback either misprices a posting against Minimum/Maximum pay
or silently drops a real AI-derived figure freehire didn't actually state.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with a real freehire posting carrying salary enrichment,
confirming it's checked against a configured Maximum pay without an AI call being trusted for the figure;
live-verify against real freehire postings that do and don't carry salary enrichment.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
