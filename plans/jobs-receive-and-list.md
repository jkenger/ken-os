# Plan: Jobs — Receive and list (release step 1)

**Branch**: jkenger/Job-Finder-Feat
**Status**: Active

## Goal

LinkedIn and Indeed job alerts, forwarded to a Loots address, show up as postings on `/jobs` within a minute, with routine strict filters (skip words, skip companies, too old) sorting them into Filtered out instead of New.

## Scope note

This plan covers only release step 1 from `docs/product/job-finder.md`: Resend receiving, the LinkedIn and Indeed parsers, repeat-posting dedup, the Jobs page with New and Filtered out, and settings. No AI scoring, no side panel, no Save/Mark applied/Dismiss — those need the posting score and side panel from step 2, and Dismiss specifically is step 5 ("Act on a match"). The Paper mockups and the Dismiss-reason work built earlier this session are for step 2+; they're reference for later plans, not this one. A step-1 posting row shows only what a LinkedIn or Indeed alert email itself carries (title, company, location, snippet, link) — no pay, job type, work setup, country, or shift, since those come from the full-posting AI read in step 2.

## Acceptance Criteria

- [ ] A forwarded LinkedIn alert shows its postings on `/jobs` within one minute of arriving.
- [ ] A forwarded Indeed alert shows its postings on `/jobs` within one minute of arriving.
- [ ] An email with a bad webhook signature, or whose original sender isn't a known alert address, is rejected and stored nowhere.
- [ ] The same posting arriving from two sources, or twice from one source, shows once on `/jobs`, listing every source it came from.
- [ ] A posting whose title matches a skip word, or whose company matches a skip company, shows under Filtered out with the matching reason.
- [ ] A posting older than the configured "posted within" window shows under Filtered out with that reason.
- [ ] Show anyway on a Filtered out posting moves it to New.
- [ ] Changing a setting (skip words, skip companies, posted within) re-filters existing postings without a new alert arriving.
- [ ] Before any email has arrived, `/jobs` shows the setup checklist (forwarding address, Gmail filter, alert signup links) instead of an empty list.
- [ ] Settings shows Roles read from the Profile headline and last two job titles, and Alert keywords built from them, with Copy.

## Slices

### Slice 1: Jobs module scaffold and setup checklist

**Value**: Behavior change — the owner can start real setup (copy the forwarding address, add the Gmail filter, open each site's alert page) before any receiving code exists, and the module has a real home in the sidebar.
**Path**: Sidebar → `/jobs` → setup checklist (Copy address, Add Gmail filter, Set up alerts for LinkedIn/Indeed/OnlineJobs), each row showing Done or Not started from env/config state only — no database read yet.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `front-end-testing`/`react-testing` for the checklist component, `typescript-strict`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: `/jobs` is reachable from the sidebar; the setup checklist renders the real `JOBS_INBOUND_ADDRESS` value and the Gmail-filter and three site-alert instructions from the spec; no tagline or narrating copy (app-language rule).
**RED or preservation baseline**: Failing test: visiting `/jobs` renders a heading "Jobs" and the five checklist rows with their instructions, before any `job_*` table exists.
**GREEN or preservation change**: Add the `/jobs` route, the sidebar entry (`workspace-shell.tsx`'s module list), and a `SetupChecklist` component reading the address from env.
**REFACTOR**: Assess once GREEN (extract checklist row component if the JSX repeats three times unchanged).
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the new checklist component and its row-state logic once the slice is otherwise ready.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build` pass.

### Slice 2: Receive and list a LinkedIn alert

**Value**: Behavior change — the owner forwards one real LinkedIn alert email and sees its postings on `/jobs` within a minute, proving the whole pipeline (webhook → verify → parse → dedup → store → list) end to end for one source.
**Path**: Resend receives the forwarded email → POST `/api/jobs/inbound` → webhook signature and known-sender checks → raw email stored in `job_inbound_emails` → LinkedIn parser extracts title/company/location/snippet/link per posting → dedup by LinkedIn's own job ID (prefixed `li-`) → rows in `job_postings` and `job_matches` (state New) → `/jobs` New list replaces the setup checklist once a posting exists.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing` (parser tested against a saved sample LinkedIn alert email, per the spec's "parser tests on saved pages" principle), `api-design` for the webhook route's error/signature semantics, `typescript-strict` for the new schema and `RawPosting` type, `functional` for the parser's extraction logic.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: matches the first three unchecked boxes above, scoped to LinkedIn only; a bad signature or unknown sender is rejected and stored nowhere; the New list shows title, company, source, and how long ago it arrived, each row linking to the source posting.
**RED or preservation baseline**: Failing tests, in order: (1) POSTing a validly-signed sample LinkedIn alert to `/api/jobs/inbound` results in its postings appearing in `job_postings`/`job_matches`; (2) a badly-signed or unknown-sender POST results in no row anywhere; (3) `/jobs` New lists those postings with the right fields; (4) posting the same alert twice does not duplicate.
**GREEN or preservation change**: `job_inbound_emails`, `job_postings`, `job_matches` tables and migration; `/api/jobs/inbound` route; `features/jobs/parsers/linkedin.ts`; `features/jobs/store.ts` dedup-and-save; the New list page reading from the store.
**REFACTOR**: Assess once GREEN (shared `RawPosting` shape and dedup helper, written so Slice 3's Indeed parser reuses them without copying the webhook/store wiring).
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the parser, dedup logic, and signature/sender verification once the slice is otherwise ready; these are the highest-value targets (silent parsing or verification bugs are the acceptance criteria's whole point).
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`, and `pnpm --filter @ken-os/web test:db:jobs` (new verify script, following the `test:db:profile` pattern) pass.

### Slice 3: Receive and list an Indeed alert

**Value**: Behavior change — proves the one-adapter-per-source pattern generalizes, and that the same posting arriving from both LinkedIn and Indeed collapses to one row listing both sources.
**Path**: Same pipeline as Slice 2, with an Indeed parser (`oj-`-equivalent prefix `in-` for Indeed's own ID) and a second saved sample email for its tests.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 2 merges.
**Required implementation skills**: Same as Slice 2.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the fourth unchecked box above — a posting from both sources shows once, listing both.
**RED or preservation baseline**: Failing tests: (1) a saved sample Indeed alert parses and lists correctly; (2) a posting already stored from LinkedIn, then also received from Indeed with a matching title/company/location (no shared ID across sources), merges into one row listing both sources instead of creating a second one.
**GREEN or preservation change**: `features/jobs/parsers/indeed.ts`; extend dedup to the title+company+location fallback match described in the spec for postings with no shared source ID.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the Indeed parser and the title+company+location dedup fallback.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm --filter @ken-os/web test:db:jobs` pass.

### Slice 4: Settings — the preferences step 1 can act on

**Value**: Behavior change — the owner can set and persist skip words, skip companies, and the posted-within window instead of them being hardcoded, and sees their real Roles and Alert keywords instead of the Setup checklist's static copy.
**Path**: `/jobs` → Settings → `job_preferences` row per owner (jsonb), read on the filter path used by Slice 5; Roles read live from the Profile headline and last two job titles; Alert keywords built from Roles with a Copy button; forwarding address shown read-only.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 2 merges (does not depend on Slice 3).
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `front-end-testing`/`react-testing`, `typescript-strict` for the preferences schema (zod, derived type).
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the last unchecked box above; saved settings persist across reload; Copy copies the exact alert-keyword string.
**RED or preservation baseline**: Failing tests: (1) saving skip words/skip companies/posted-within persists and reloads correctly; (2) Roles and Alert keywords reflect the current Profile headline and last two titles, including when Profile changes.
**GREEN or preservation change**: `job_preferences` table and migration; `features/jobs/preferences-store.ts`; the Settings page section for this subset of the full preferences table (the rest — pay, job type, work setup, countries, shifts, seniority, agencies, instant-email threshold, digest time — belongs to step 2/3, out of scope here).
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the preferences store and the Role/Alert-keyword derivation.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm --filter @ken-os/web test:db:jobs` pass.

### Slice 5: Filtered out

**Value**: Behavior change — a posting that fails a strict filter is visibly sorted, with its reason, instead of silently missing from New or silently included; the owner can override one with Show anyway.
**Path**: `/jobs` → Filtered out tab, rows from `job_matches` in state Filtered-out, each showing which setting excluded it; Show anyway sets state back to New; a settings change (from Slice 4) re-evaluates existing postings without waiting for a new alert.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 4 merges.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `front-end-testing`/`react-testing`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the two skip-word/skip-company/posted-within boxes above, plus Show anyway and the re-filter-on-settings-change box.
**RED or preservation baseline**: Failing tests: (1) a posting whose title matches a configured skip word lands in Filtered out with that reason, not New; (2) Show anyway moves it to New; (3) adding a new skip word re-filters postings already stored, without a new alert.
**GREEN or preservation change**: `features/jobs/filters.ts` (pure functions: posting + preferences → pass/fail + reason); apply on write (new posting) and on preferences save (re-filter existing); the Filtered out page and Show anyway action.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on `filters.ts` — this is the slice where a silent off-by-one or inverted condition would be most damaging (a posting hidden that shouldn't be, or shown that should be filtered).
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`, `pnpm --filter @ken-os/web test:db:jobs` pass.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
