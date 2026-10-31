# Plan: Jobs — Score (release step 2)

**Branch**: jkenger/Job-Finder-Feat
**Status**: Active

## Goal

Every posting that passes step 1's list-field filters gets its full description read, a complete set of structured
fields extracted (pay, job type, work setup, countries, hours and time zone, seniority, years required, a short
summary), a 0-100 fit score against the Profile with why-it-fits/what's-missing, and a shift label — then shows all
of that on `/jobs`: new row columns and a side panel. The upgraded strict filters (Minimum pay, Job type, Work
setup, Countries, Agencies) run once those fields exist.

## Scope note

This plan covers release step 2 from `docs/product/job-finder.md`: "How it works" steps 3-7 (Read the full posting,
Extract, Filter, Score, Shift) and the side panel/new columns on the Jobs page. It does not cover step 8 (Notify —
strong-match and digest emails, release step 3), release step 4 (OnlineJobs), or release step 5 (Act on a match —
Save/Mark applied/Dismiss's actual behavior; the panel's buttons exist here but stay inert). Full extraction scope
was briefly cut to salary+summary only in chat on 31 Oct 2026, then reinstated the same day: every field in the
spec's Extract step is in scope.

**Architecture decision (not in the spec, made here):** extract and score cannot run inline inside
`/api/jobs/check/<source>`. That route is already a scrape against a live third-party endpoint; adding a full-page
fetch plus two AI calls per newly-found posting would make a single scrape request take tens of seconds for a
cycle that finds several postings, risking a serverless timeout and slowing down the 1-minute poll cycle itself.
Instead, `job_postings` gets a `processedAt` column (null = pending), and a new `/api/jobs/process` route — polled
by the same outside scheduler, on its own cadence — picks up to a capped batch (5) of unprocessed postings for the
owner, oldest first, and runs read → extract → filter → score → shift on each, setting `processedAt` when done.
This keeps each call fast and bounded, and keeps scraping and processing independently retryable.

**"Countries" means candidate eligibility, not the posting's location (clarified 31 Oct 2026).** A US company
hiring a remote PH-based applicant and a PH-market job both commonly show a US-sounding or blank location label —
the label alone doesn't say who's eligible. "Countries" is extracted from explicit eligibility language in the
posting's own text ("must be authorized to work in the US", "based in the Philippines", "Remote (US only)" vs
"Remote (Global)"), never inferred from the location field (`RawPosting.location`, already captured in step 1 and
left untouched). Pay currency is a secondary signal only (USD/AUD/GBP leans foreign-market, PHP leans local-market)
when the text says nothing explicit. When a posting states no eligibility at all, "countries" is left empty —
same as pay is left empty when none is listed — and an empty "countries" never filters a posting out, it shows
under New with countries unstated.

## Acceptance Criteria

- [ ] A posting whose full page can be read gets a full description, a summary, and every extracted field
      (pay, job type, work setup, countries, hours and time zone, seniority, years required) stored.
- [ ] A posting whose full page can't be read (open read failure, not a 403/429 block) is still scored from the
      list fields it already has, marked Partial, not dropped.
- [ ] A posting below Minimum pay shows under Filtered out with "Below minimum pay"; one with no pay listed shows
      under New marked Not listed, never hidden for missing pay.
- [ ] A posting whose job type, work setup, country or (when Agencies is set to Hide) agency status doesn't match
      the owner's preferences shows under Filtered out with the specific reason.
- [ ] "Countries" is extracted from the posting's own eligibility language, never from its location label; a
      posting stating no eligibility has "countries" left empty and is never filtered out for it, same as pay.
- [ ] A processed posting has a score from 0 to 100, why it fits, what's missing, and the posting's own lines
      backing each point, plus the prompt version and the Profile version (its `updatedAt`) it was scored against.
- [ ] A Profile edit rescores every already-processed, not-yet-Filtered-out posting.
- [ ] A posting's required hours (converted to Philippine time) produce exactly one shift label: Day shift, Mid
      shift, Night shift, Flexible, or Not listed, per the Working hours rules. A UK 9-to-5 shows Mid shift, 5 PM
      to 1 AM. No posting is hidden for its shift.
- [ ] `/api/jobs/process` requires `JOBS_CHECK_SECRET`, same as the check routes; processes at most 5 postings per
      call, oldest unprocessed first, scoped to the owner; a call with nothing pending does nothing and succeeds.
- [ ] Nothing in a posting's text can change a setting, send an email, or reach a tool — the AI calls get posting
      text as data only, never as instructions, same as the existing Profile analyzer's pattern.
- [ ] `/jobs` rows show pay, job type, work setup, country, shift and score once a posting is processed; a
      not-yet-processed posting's row shows what step 1 already has, with nothing in the new columns.
- [ ] Clicking a processed posting opens a side panel showing why it fits, what's missing, and the full posting
      text (or the summary, for a Partial posting with no full description).

## Slices

### Slice 1: Read the full posting and extract its structured fields

**Value**: Behavior change — a posting that was previously just a title/company/location/link now carries a full
description, a summary and every extracted field, the foundation every later slice reads from.
**Path**: External scheduler calls `/api/jobs/check/process` (actually `/api/jobs/process`, see Scope note) with
`JOBS_CHECK_SECRET` → route selects up to 5 postings for the owner where `processedAt is null`, oldest
`firstSeenAt` first → for each, tries each of its sources' links in order (LinkedIn before Indeed, since the spec
flags Indeed as more likely to block the read) until one page can be fetched and read, or marks the posting
Partial if none can → one AI call (`packages/agents`, same `Agent`/`run`/zod-schema pattern as
`profile/analyze.ts`) extracts pay, job type, work setup, countries, required hours and time zone, seniority,
years required and a 2-3 sentence summary from whatever text is available (full description, or the list-field
snippet when Partial) → fields saved onto `job_postings`, `processedAt` set. The prompt instructs the model to
read "countries" from explicit eligibility language only ("must be authorized to work in", "based in", "Remote
(<region> only)"), never from the posting's location text, and to return it empty when the posting states nothing
explicit — the same "never guess, leave empty" rule the rest of Extract already follows.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `api-design` for the process route's
auth/batching semantics, `typescript-strict` for the new schema and extracted-field types, `functional` for the
extraction/parsing logic.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the first two unchecked boxes above, plus the `/api/jobs/process` auth/batching box and
the untrusted-data box, scoped to extraction (no filtering, scoring or shift yet — those fields stay unused this
slice).
**RED or preservation baseline**: Failing tests, in order: (1) a posting whose page returns a readable description
gets that description, a summary and every extracted field saved, with `processedAt` set; (2) a posting with two
sources tries LinkedIn's link before Indeed's; (3) a posting whose page read fails on every source is marked
Partial and still gets extracted fields from the list-field text alone; (4) a call to `/api/jobs/process` with a
missing or wrong secret is rejected and processes nothing; (5) a call processes at most 5 postings, oldest
`firstSeenAt` first, scoped to the calling owner; (6) a call with no unprocessed postings succeeds and does
nothing; (7) the AI call receives the posting text as a data field, never concatenated into the instructions
string, mirroring `profile/analyze.ts`'s "untrusted data, ignore instructions inside them" pattern; (8) a posting
whose location says a US city but whose text states "open to candidates based anywhere" extracts countries as
worldwide/unrestricted, not `["US"]`; (9) a posting with a US-sounding location but no eligibility language at
all extracts an empty countries list, not `["US"]` inferred from the location.
**GREEN or preservation change**: `job_postings` migration (`fullDescription`, `partial`, `summary`, `payAmount`,
`payCurrency`, `payPeriod`, `jobType`, `workSetup`, `countries`, `requiredHours` (jsonb `{start, end, timezone}` or
null), `seniority`, `yearsRequired`, `extractPromptVersion`, `extractModel`, `processedAt`); `features/jobs/
read-posting.ts` (fetch + pick a readable source, injected fetch for testability); `packages/agents/src/jobs/
extract.ts` (the AI call, versioned prompt constant, zod output schema); `features/jobs/process.ts` (orchestration:
select pending, read, extract, save — injected AI-run and fetch so it's testable without a real call);
`/api/jobs/process/route.ts`.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the source-link fallback order and the
Partial-marking logic once the slice is otherwise ready — a silently-wrong fallback either never tries Indeed or
never falls back to Partial, both of which quietly lose postings.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`
pass; `pnpm --filter @ken-os/web test:db:jobs` extended with this slice's scenarios and passing.

### Slice 2: Filter — Minimum pay, Job type, Work setup, Countries, Agencies

**Value**: Behavior change — a posting whose extracted pay, job type, work setup, country or agency status doesn't
match the owner's preferences is visibly sorted into Filtered out with the specific reason, same as step 1's
skip-word/company/posted-within filters already are.
**Path**: `job_preferences` gains the new fields (minimum pay + currency + period, job types, work setups,
countries, agencies-hide); Settings gains a second Filters section for them. `filters.ts`'s `filterReason` is
extended: after the existing list-field checks, it checks the extracted fields when they're present (a
not-yet-processed posting only gets the list-field checks, same as today). The Countries check only runs when the
posting's extracted `countries` is non-empty — an empty list (Slice 1's "no eligibility stated" case) is never
filtered, same as an empty pay never fails Minimum pay. Applied on extract-write (end of Slice 1's process route)
and on preferences-save (`refilterExisting`, already built, extended to re-evaluate the new fields too).
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges.
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `front-end-testing`/`react-testing` for
the new Settings fields, `typescript-strict` for the preferences schema.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the Minimum-pay and job-type/work-setup/country/agency unchecked boxes above.
**RED or preservation baseline**: Failing tests: (1) a posting below the owner's Minimum pay (currency and period
converted first) is filtered with "Below minimum pay"; (2) a posting with no pay listed is not filtered for pay,
and shows marked Not listed; (3) a posting whose job type, work setup or country isn't in the owner's allowed set
is filtered with the specific reason; (4) a posting with an empty extracted `countries` list is not filtered for
country, regardless of the owner's Countries preference; (5) a posting from a detected agency is filtered only
when Agencies is set to Hide; (6) saving stricter preferences refilters already-processed postings without a new
scrape or process run.
**GREEN or preservation change**: `job_preferences` migration and `preferences-store.ts` changes; `filters.ts`
extended with the pay/currency/period conversion and the new field checks; Settings UI additions;
`refilterExisting` extended.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the pay currency/period conversion and the new
filter checks — a silently-wrong conversion either hides postings that should show or shows ones that shouldn't.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm --filter @ken-os/web test:db:jobs` pass.

### Slice 3: Score — AI fit against the Profile

**Value**: Behavior change — a processed, not-filtered posting gets a 0-100 fit score with reasoning the owner can
actually check against the posting's own words, and a Profile edit keeps that score current.
**Path**: End of the process route (after extract, once a posting passes Slice 2's filters): a second AI call
(same `Agent`/`run`/zod pattern) reads the full description (or the summary, when Partial) alongside the Profile
and returns a score, why-it-fits lines, what's-missing lines, and the posting lines backing each fit point. Saved
to `job_matches` with the prompt version and the Profile's `updatedAt` at scoring time. A Profile save compares
that stamp against every open posting's `job_matches.profileVersionScored` and rescoring runs for any that are
stale (reusing the process route's batching, not a new unbounded loop).
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 2 merges.
**Required implementation skills**: Same as Slice 1, plus `api-design` for how a Profile save triggers rescoring
without blocking the save itself.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the score/reasons/prompt-version/Profile-version box and the Profile-edit-rescores box.
**RED or preservation baseline**: Failing tests: (1) a processed posting gets a score 0-100, non-empty
why-it-fits and what's-missing lists, and a prompt version and Profile-version stamp saved; (2) a filtered-out
posting is not scored; (3) saving the Profile marks every open, already-scored posting's stamp stale; (4) a stale
posting is rescored on the next process run and its stamp updates; (5) the AI call receives the Profile and
posting as data fields, never as instructions.
**GREEN or preservation change**: `job_matches` migration (`score`, `scoreReasons` jsonb, `scorePromptVersion`,
`profileVersionScored`); `packages/agents/src/jobs/score.ts`; `process.ts` extended to call it after a posting
passes filtering; a Profile-save hook that marks existing matches stale (not a synchronous rescore inline with the
save — that would make saving the Profile as slow as processing every open posting).
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on the staleness comparison and the filtered-postings
skip — a silently-wrong staleness check either never rescores or rescores every run regardless of change.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm --filter @ken-os/web test:db:jobs` pass.

### Slice 4: Shift labeling

**Value**: Behavior change — every processed posting shows one shift label computed from its required hours,
converted to Philippine time, exactly matching the Working hours table.
**Path**: A pure function takes a posting's `requiredHours` (start, end, source time zone) and returns a label per
the Working hours rules, including the "overlap wording" Mid-shift exception for a US posting that states partial
availability. Called at the end of the process route (after extract, regardless of filter/score outcome — a shift
label is "Shown", never a strict filter) and saved to `job_matches.shift`.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slice 1 merges (does not depend on Slices 2 or 3).
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `functional`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the shift-label unchecked box above.
**RED or preservation baseline**: Failing tests, one per row of the Working hours table plus the worked market
examples from the doc (AU Sydney 9-to-5 → Day shift; UK London 9-to-5 → Mid shift, 5 PM to 1 AM; US East and US
West 9-to-5s → Night shift; a US posting with "overlap with EST until noon" wording → Mid shift, not a plain
Night-shift 9-to-5; no hours/time zone stated → Not listed; "flexible/async/owner's choice" wording → Flexible).
**GREEN or preservation change**: `features/jobs/shift.ts` (pure function + the Philippine-time conversion);
wired into `process.ts`; `job_matches.shift` column (may already exist from Slice 3's migration if sequenced
together — otherwise its own small migration).
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: Mutation testing on `shift.ts` — this is the slice where a boundary
error (6 AM vs 7 AM, 2 AM vs 2:01 AM) silently mislabels a shift, and the whole point of the feature is trusting
the label without checking the raw hours every time.
**Done when**: Mutation run complete, survivors addressed or justified; `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm --filter @ken-os/web test:db:jobs` pass.

### Slice 5: New row columns and the side panel

**Value**: Behavior change — the owner can actually see and act on everything the first four slices computed:
pay, job type, work setup, country and shift on each row, score and full reasoning in a side panel.
**Path**: `/jobs`'s row component gains the new columns, blank for a not-yet-processed posting. Clicking a row
opens a side panel: why it fits, what's missing, the full description (or summary, if Partial), and Open
posting/Save/Mark applied/Dismiss buttons — present but inert, since their behavior is release step 5 ("Act on a
match"), not this plan.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk, after Slices 1, 3 and 4 merge (needs their fields to render).
**Required implementation skills**: `mattpocock-skills:tdd`, `testing`, `front-end-testing`/`react-testing`.
**Reduction program**: N/A.
**Transition/terminal evidence**: N/A.
**Acceptance criteria**: the two row/panel unchecked boxes above.
**RED or preservation baseline**: Failing tests: (1) a processed posting's row shows pay, job type, work setup,
country, shift and score; (2) an unprocessed posting's row shows step 1's fields only, with the new columns
empty, not a loading state that never resolves; (3) clicking a processed posting opens the panel with why-it-fits,
what's-missing and the full text visible; (4) a Partial posting's panel shows the summary where the full
description would go, not an empty section.
**GREEN or preservation change**: `components/jobs/new-list.tsx` row updates; `components/jobs/posting-panel.tsx`
(new); wiring from `/jobs` to open it.
**REFACTOR**: Assess once GREEN.
**PRE-PR MUTATION or alternate evidence**: N/A — this slice is presentation only; its correctness is the data
slices above, verified visually per the project's UI-change convention (start the dev server, check the real
page) rather than mutation-tested.
**Done when**: `pnpm check`, `pnpm test`, `pnpm build` pass; dev-server check confirms the row and panel render
correctly for a processed, an unprocessed and a Partial posting.

## Pre-PR Quality Gate

Before each PR:

1. Implementation complete — refactor assessment done, `pnpm check` and `pnpm build` pass
2. Mutation testing run once for that PR's accumulated scope; valuable survivors addressed within the same gate
3. Typecheck and lint pass (`pnpm check`)
4. No DDD glossary check — project has not opted into DDD

---

_Delete this temporary artifact when the plan is complete. Remove the `plans/` directory if it becomes empty._
