# Plan: Jobs — Eligibility fix, Maximum pay, and a We Work Remotely source

**Branch**: jkenger/Job-Finder-Feat
**Status**: Active

## Goal

A posting that explicitly says it's open to everyone is never confused with one that says nothing at all; the owner
can cap pay the same way they already floor it; and a new source whose own listing form requires eligibility to be
declared brings in postings the strict Countries filter can actually pass.

## Scope note

This plan covers three independent but related gaps found while live-testing the single-currency revision
(`plans/jobs-multi-currency-pay.md`) and the "hide unstated eligibility by default" change already shipped.

**Slice 1 is a real bug in already-shipped code, not new scope.** `packages/agents/src/jobs/extract.ts`'s prompt
already tells the model to read "open to candidates anywhere" / "Remote (Global)" as explicit eligibility language,
distinct from a posting that states nothing — but the output schema has only one field, `countries: string[]`,
and both cases collapse to an empty array. Since the Countries filter was flipped to hide an empty array by
default, a posting that explicitly says "worldwide" is now wrongly treated exactly like one that said nothing,
and gets hidden. This must ship before Slice 3, which will make "explicitly worldwide" postings common.

**Slice 2 is the owner's own request**: "most of the posting targeting ph or asean salary goes around 15k to
200k... sometimes per hour or per monthly." A Maximum pay, mirroring the Minimum pay already built (one currency,
one period, the same cached-rate conversion from `currency-rates.ts`), turns that observation into a filter.

**Slice 3 follows from this session's research**: LinkedIn and Indeed's public, guest-accessible pages carry no
structured eligibility field at all (confirmed against JobSpy's actual source — github.com/speedyapply/JobSpy).
Boards that do carry one (Remotive's `candidate_required_location`, We Work Remotely's `<region>`) only have it
because their own submission form requires the employer to declare it, not because of better parsing. Remotive's
free API was live-checked in this session and found functionally broken for real use — `search`, `category` and
`limit` are all ignored, it always returns the same ~13 jobs, consistent with its legal notice that real access
needs a paid $5k/mo tier. We Work Remotely's RSS feed was live-checked and found genuinely usable: no auth, no
Cloudflare challenge (unlike its main HTML site, which must never be scraped directly), a structured `<region>`
per item, and the full HTML description already inline — no separate full-page fetch the way LinkedIn/Indeed need.
The feed declares `<ttl>60</ttl>` (minutes) at the channel level; this is a real, different poll cadence from
LinkedIn/Indeed's existing once-a-minute loop, not a number to match for consistency.

**Ordering**: Slice 1 before Slice 3 (not a hard technical dependency, but shipping Slice 3 first would mean its
"explicitly worldwide" postings land straight into the bug Slice 1 fixes). Slice 2 is independent of both.

## Acceptance Criteria

- [ ] A posting that explicitly states it's open to everyone, or explicitly lists the owner's target country, is
      never filtered for Country. Only a posting that states nothing about eligibility at all is.
- [ ] A posting whose own stated pay, converted into the owner's one currency, is above the configured Maximum
      pay is filtered out with "Above maximum pay". A posting within range, or with no maximum set, is not.
- [ ] Postings from We Work Remotely appear in the feed alongside LinkedIn and Indeed, polled on their own
      cadence (at most once an hour), with the feed's own region field passed into extraction as a labeled hint.

## Slices

### Slice 1: Distinguish "says nothing" from "explicitly open to everyone"

**Value**: Behavior change — a posting that explicitly states worldwide/open eligibility, or explicitly lists the
owner's target country, is shown; only a posting that states nothing at all is hidden. Closes a real correctness
gap in the already-shipped "hide unstated eligibility by default" change.
**Path**: `packages/agents/src/jobs/extract.ts`'s output schema gains `eligibilityStated: z.boolean()` (prompt:
true whenever the posting says _anything_ about who may apply, including "open to everyone"; false only when it
says nothing at all); prompt version bumps. `ExtractedPosting` gains the field. `apps/web/src/features/jobs/
store.ts`'s `ExtractedFields` and `saveExtractedFields` gain/pass it. `job_postings` gains an `eligibility_stated`
boolean column (migration; backfill existing processed rows to `true` where `countries` is already non-empty,
`false` otherwise — a non-empty list could only exist if eligibility was stated). `refilterExisting`'s select
gains the column. `apps/web/src/features/jobs/filters.ts`'s `FilterablePosting` gains
`eligibilityStated?: boolean`; the Countries check becomes three-way: not-yet-processed (`eligibilityStated`
undefined) → skip, unchanged; processed and `eligibilityStated === false` → "Country: not stated", unchanged
reason text; processed and `eligibilityStated === true` with an empty `countries` array (explicitly worldwide) →
never filtered; processed and `eligibilityStated === true` with a non-empty list → check membership, unchanged.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict` for the new column
and extraction field.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first unchecked box above.
**RED or preservation baseline**: Failing tests, in order: (1) a processed posting with `eligibilityStated: false`
and an empty `countries` list is filtered "Country: not stated" (preserved); (2) a processed posting with
`eligibilityStated: true` and an empty `countries` list (explicitly worldwide) is _not_ filtered; (3) a processed
posting with `eligibilityStated: true` and a non-empty list not including the target is filtered
"Country: `<code>`" (preserved); (4) a processed posting with `eligibilityStated: true` and a list including the
target is not filtered (preserved); (5) a not-yet-processed posting (`eligibilityStated` undefined) is not
filtered for country (preserved).
**GREEN or preservation change**: `job_postings` migration adding `eligibility_stated boolean not null default
false`, with a backfill `UPDATE` in the same migration for already-processed rows; `extract.ts`'s schema/prompt;
`store.ts`'s `ExtractedFields`/`saveExtractedFields`; `filters.ts`'s three-way Countries check.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the three-way branch (not-processed / stated-false
/ stated-true) — a silently wrong branch either hides a genuinely worldwide-open posting or shows one that should
be hidden.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with this slice's scenarios and passing.

### Slice 2: Maximum pay

**Value**: Behavior change — a posting whose converted pay is above the owner's configured ceiling is filtered
out, symmetric to the Minimum pay floor already built. Turns the owner's own observation ("PH/ASEAN postings run
roughly 15k–200k, hourly or monthly") into an actual filter instead of just a floor.
**Path**: `apps/web/src/features/jobs/preferences-store.ts`'s `JobPreferences` gains `maximumPay: number | null`,
sharing the existing `payCurrency`/`payPeriod` (one band, not a second currency/period pair). `parsePreferences`
validates it (a number ≥ 0, or null) and rejects `maximumPay < minimumPay` when both are set, naming the problem
rather than silently filtering everything. `job_preferences` gains a `maximum_pay` real nullable column
(migration). `apps/web/src/features/jobs/filters.ts`'s pay check reuses the `converted` monthly value already
computed for Minimum pay: when `preferences.maximumPay !== null` and the converted monthly amount exceeds
`monthlyAmount(preferences.maximumPay, preferences.payPeriod)`, return "Above maximum pay". Settings gains a
Maximum pay input next to the existing Minimum pay row.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict` for the preferences
validation, `front-end-testing`/`react-testing` for the Settings addition.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the second unchecked box above.
**RED or preservation baseline**: Failing tests: (1) a posting whose converted pay exceeds the configured maximum
is filtered "Above maximum pay"; (2) a posting within `[minimum, maximum]` is not filtered; (3) a posting exactly
at the maximum is not filtered (inclusive boundary, matching Minimum pay's existing `>=` behavior); (4) a posting
with no maximum configured (`null`) is never filtered for being too high; (5) a posting with no pay listed is
unaffected; (6) a posting in a different currency still converts via the cached rates before comparing against
the maximum, same as it already does for the minimum; (7) `parsePreferences` rejects `maximumPay < minimumPay`
when both are set.
**GREEN or preservation change**: `preferences-store.ts`, `job_preferences` migration, `filters.ts`'s extended pay
check, Settings UI.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the above-maximum boundary and the
min-greater-than-max validation guard — a silently wrong boundary either hides postings that should show or
shows ones that should be capped out.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with a real posting inside the 15k–200k PHP/month band
passing and one above it filtered.

### Slice 3: We Work Remotely as a third source

**Value**: Behavior change — the owner's feed gains postings from a source whose own submission form requires
eligibility to be declared, landing postings the strict Countries filter can actually pass, rather than relying
solely on LinkedIn/Indeed where that data is confirmed structurally absent.
**Path**: `AlertSource` in `raw-posting.ts` gains `"weworkremotely"` (ripples: `read-posting.ts`'s `SOURCE_ORDER`
and `PARSERS`, `words.ts`'s `sourceWords`; `scraper-state.ts` is already generic over `AlertSource`). New
`apps/web/src/features/jobs/scrapers/weworkremotely.ts` fetches the combined feed
(`https://weworkremotely.com/remote-jobs.rss` — not a single category; the owner's searched roles don't map onto
WWR's fixed category list) and parses each `<item>` (`title`, `region`, `country`, `category`, `type`,
`description` — already full HTML — `link`, `guid` as `sourceId`) into a `RawPosting`. **Open implementation
decision to resolve at slice start, not fully fixed by research**: where the region/country hint travels to reach
extraction, since `RawPosting` has no spare field and widening it would ripple into LinkedIn/Indeed too — likely
carried in `snippet` (already free-text extraction input) or threaded as a second value alongside the saved
posting; record whichever is chosen with its reasoning. No `read-posting.ts` fetch step runs for WWR — the RSS
item already carries the full description; the posting is never "Partial". `extract.ts`'s prompt and input gain
an optional labeled hint (e.g. `statedLocation?: string`), instructing the model to treat it as the posting's own
structured eligibility field when present, ahead of scanning prose. New
`apps/web/src/app/api/jobs/check/weworkremotely/route.ts`, modelled on `check/indeed` and `check/linkedin` but
_without_ `check-source.ts`'s per-keyword loop — the combined feed has no search parameter, so the route fetches
once and lets skip-words/title filtering sort relevance downstream, the same way Countries already filters
post-fetch. `apps/web/scripts/dev-with-poll.ts` gains a _separate_ hourly interval, not folded into the existing
once-a-minute LinkedIn/Indeed loop, respecting the feed's own `<ttl>60</ttl>` (minutes).
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges (ordering, not a hard technical dependency).
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `api-design` for the no-keyword-loop check
route, `typescript-strict` for the `AlertSource` ripple.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the third unchecked box above.
**RED or preservation baseline**: Failing tests, in order: (1) parsing a saved _real_ sample WWR RSS response (a
genuine capture from this session's live check, not a guessed fixture — stronger than the existing LinkedIn/Indeed
fixture precedent) extracts every item with title/company/location/link and a guid-based `sourceId`; (2) a
response that fails to parse (malformed XML, non-200) is treated as a soft failure, never a thrown error, matching
the project's existing "untrusted, never throw" convention for the LinkedIn/Indeed parsers; (3) each item's
region/country hint is captured and reaches extraction's input; (4) a WWR-sourced posting's full text comes
directly from the RSS item, never through `read-posting.ts`'s source-link fallback; (5) the WWR check route
rejects a bad secret, same as the other two; (6) `dev-with-poll.ts` fires the WWR poll on its own hourly interval,
independent of the once-a-minute LinkedIn/Indeed interval (test the interval wiring/constants, not real timers).
**GREEN or preservation change**: `raw-posting.ts`, `scrapers/weworkremotely.ts`, the resolved hint-carrying
mechanism, `extract.ts`'s labeled hint, `check/weworkremotely/route.ts`, `dev-with-poll.ts`'s second interval,
`read-posting.ts`/`words.ts` ripple updates.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the RSS-item parsing (a silently wrong parse either
drops real postings or fabricates fields) and the hourly-vs-once-a-minute cadence split (a silently-merged cadence
would violate the feed's own rate guidance).
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended; live-verify against the real feed (confirm real items
parse, confirm a real "Anywhere in the World" item's hint reaches extraction and the resulting posting is
correctly not filtered for Country under Slice 1's fix).

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
