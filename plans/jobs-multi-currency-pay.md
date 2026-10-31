# Plan: Jobs — Multi-currency Minimum Pay

**Branch**: jkenger/Job-Finder-Feat
**Status**: Active

## Goal

A posting is checked against the owner's Minimum Pay in whatever currency it actually states, not only in the one
currency the owner happens to have configured, so a PHP minimum and a USD posting (or any other currency pair) are
compared correctly instead of the posting being silently skipped.

## Scope note

This revises Jobs Score Slice 2 (`plans/jobs-score.md`, already shipped and committed as `4c59d89`), which built
Minimum Pay as three flat fields (`minimumPay`, `payCurrency`, `payPeriod`) and only checked a posting when its
currency matched that one configured currency exactly. A posting in any other currency was never filtered for pay
at all — shown, same as "no pay listed." That was a deliberate, documented scope cut at the time (no live FX
conversion), but it meant most non-local postings never got a pay check. This plan keeps the "no live conversion"
rule and closes the gap a different way: more than one currency threshold, configured once, compared without any
network call ever.

**Filtering keys off the posting's own stated currency, not its countries (decision made here).** The initial ask
was to merge Countries and Minimum Pay so pay is "under the country." That was tried and rejected: a PH-targeted
remote posting very commonly still states its pay in USD — which is the exact scenario that motivated this plan.
Keying the filter check by the posting's matched country would silently reproduce the same gap under a different
name, the same mistake Slice 2 already made once. So the two stay decoupled at evaluation time, exactly like
Countries and Minimum Pay already are independent checks in `filters.ts` today:

- **Filter evaluation** (Slice 1 below): looks up the posting's own `payCurrency` in the owner's list of configured
  thresholds. Countries never enter into it.
- **Settings UI convenience** (Slice 2 below): uses the owner's selected Countries only to _suggest_ which
  currencies are worth configuring, and to _autofill_ a starting value for each. Purely a data-entry aid.

**No live currency conversion anywhere, ever.** Confirmed against how other boards handle this: LinkedIn shows pay
in the posting's own currency with no conversion at all; Indeed normalizes once at ingest time, not per filter
run; no board surveyed calls a live FX rate per request. This plan's one-time autofill conversion (Slice 2) uses a
fixed, code-committed rate table, the same shape as the existing `PERIODS_PER_MONTH` table already in
`filters.ts` for pay-period conversion — refreshed occasionally by a code change, never fetched live, and never
read during filter evaluation.

**Migration safety.** Slice 1's schema migration backfills every existing single-currency row into the new
multi-currency shape in the migration SQL itself, not in application code on next read. An owner who already has
a working Minimum Pay setting must not see it silently stop filtering the moment this ships.

## Acceptance Criteria

- [ ] A posting whose stated currency has a configured threshold is correctly filtered against that threshold,
      period-normalized, regardless of how many other currencies are configured.
- [ ] A posting whose stated currency has no configured threshold is never filtered for pay — shown under New,
      same as a posting with no pay listed at all.
- [ ] The owner can configure a minimum pay in more than one currency at once; an existing Slice 2 single-currency
      setting keeps filtering exactly as before, with no gap at the moment this ships.
- [ ] Settings groups the currency inputs by the owner's selected Countries, using a fixed country-to-currency
      table, so the owner isn't required to already know which currency each country uses.
- [ ] Entering one currency's minimum pay autofills every other suggested currency's threshold once, converted via
      a fixed rate table; every autofilled value is independently editable and is never recalculated or
      overwritten by a later save.
- [ ] No network call happens during filtering or during a Settings save. Every conversion table is static data
      read in-process.

## Slices

### Slice 1: Multi-currency Minimum Pay thresholds

**Value**: Behavior change — a posting below or above the owner's minimum, stated in any currency the owner has
configured, is now actually checked; today it's silently skipped unless it happens to match the one configured
currency.
**Path**: `job_preferences`'s three flat fields (`minimumPay`, `payCurrency`, `payPeriod`) are replaced by
`payThresholds: { currency, minimumPay, payPeriod }[]`. The schema migration backfills each existing row's single
currency into a one-item array in the migration SQL itself. `filters.ts`'s Minimum Pay check changes from "does
the posting's currency equal my one configured currency" to "does the posting's currency match any configured
threshold" — a lookup, not an equality check; no match still means not filtered for pay, preserving today's safe
fallback for every other currency. Settings replaces the single currency/amount/period inputs with a repeatable
list (add/remove a currency row), still entirely manual entry at this slice.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `typescript-strict` for the array-shaped
preference and its migration, `front-end-testing`/`react-testing` for the repeatable Settings rows.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first three unchecked boxes above.
**RED or preservation baseline**: Failing tests, in order: (1) a posting whose currency matches one configured
threshold, below it, is filtered "Below minimum pay"; (2) a posting whose currency matches a _different_
configured threshold, above it, is not filtered; (3) a posting whose currency has no configured threshold at all
is not filtered for pay; (4) a posting with no pay listed is still not filtered for pay (preserved from Slice 2);
(5) period normalization still applies per threshold (an hourly posting against a monthly threshold in the same
currency); (6) saving two thresholds in different currencies lets both filter correctly in the same run; (7) an
existing Slice 2 single-currency preference row, read after the migration, behaves exactly as it did before —
same postings filtered, same ones shown; (8) the Settings list lets the owner add a second currency row and
remove one, each validated independently (amount ≥ 0, currency non-blank, a valid period).
**GREEN or preservation change**: `job_preferences` migration (drop the three columns, add `pay_thresholds`
jsonb, backfill existing rows in the same migration); `preferences-store.ts` (`JobPreferences.payThresholds:
PayThreshold[]`, `parsePreferences` validates the array); `filters.ts` (currency-lookup check replacing the
single-currency equality check); Settings UI (repeatable currency/amount/period row list).
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the currency-lookup matching and the
per-threshold period normalization — a silently-wrong lookup either matches the wrong threshold or never matches
any configured one, both of which wrongly show or hide postings.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with this slice's scenarios, including the migration
backfill, and passing.

### Slice 2: Country-grouped currency suggestions and one-time autofill

**Value**: Behavior change — the owner doesn't need to already know which currency each country they picked
uses, or do the conversion math by hand; typing one number fills in a sensible starting point for every other
currency their selected Countries imply, each still editable.
**Path**: A fixed ISO country-to-default-currency table (`features/jobs/country-currency.ts` — e.g. US→USD,
PH→PHP, GB→GBP, AU→AUD, CA→CAD, SG→SGD, extendable) drives the Settings UI: for each of the owner's selected
Countries, show its default currency as a suggested row when no threshold for that currency exists yet. A fixed,
code-committed conversion-rate table (`features/jobs/currency-rates.ts`, documented as a periodically-refreshed
snapshot, never fetched live) converts one anchor value the owner types into every other suggested currency's
row, once, at the moment it's added — never recalculated on a later save, so an edited value is never silently
overwritten. Purely a Settings convenience: `filters.ts`'s lookup from Slice 1 is unchanged, since it was already
decoupled from Countries by design.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `functional` for the pure conversion
function, `front-end-testing`/`react-testing` for the Settings wiring.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the Countries-grouping and autofill unchecked boxes above.
**RED or preservation baseline**: Failing tests: (1) selecting a new country whose default currency has no
threshold yet shows a suggested row for that currency; (2) typing an amount into one currency's row autofills
every other suggested, not-yet-set currency's row via the fixed rate table, period-normalized the same as the
anchor; (3) a country whose default currency already has a manually-set threshold is never autofilled over; (4)
editing an autofilled value and saving keeps the edited value, and a later unrelated save never recalculates or
overwrites it; (5) a country with no entry in the country-currency table shows no suggestion, not an error, and
the owner can still add any currency manually; (6) the conversion math itself matches hand-computed expected
values for a few currency pairs.
**GREEN or preservation change**: `country-currency.ts`, `currency-rates.ts` (both pure, static data), a pure
`suggestThresholds`/`autofillThreshold` function, Settings UI wiring (suggested rows per selected country,
one-time autofill on first entry).
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the autofill trigger condition ("only when not
already set, only once") — a silently-wrong condition either never autofills (no convenience gained) or
clobbers an owner's edited value on a later save (loses their intent).
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; dev-server check confirms the Settings behavior for a fresh country selection, an edited override, and a
country with no currency mapping.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
