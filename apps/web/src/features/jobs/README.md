# Jobs

A job board that finds postings matching the owner's own Profile and preferences, scores each one against that
Profile, and shows why. Full product spec: `docs/product/job-finder.md`. Source-migration history: the two
`plans/jobs-*.md` files.

## What it does

- Polls freehire's public, keyless search API once a minute for the owner's roles, turns results into postings, and
  drops repeats.
- Reads each posting's full text, extracts structured fields (pay, job type, work setup, seniority, years required,
  countries, shift hours) and scores it against the owner's Profile.
- Applies strict filters the owner sets (pay, job type, work setup, countries) to hide postings that don't fit, but
  keeps them visible under "Filtered out" with the reason. Nothing disappears silently.
- Shows a Have/Related/Missing skills breakdown and any requirement mismatches (years, work setup) on each posting's
  detail page, next to the raw listing.

## Decisions worth knowing before changing this code

- **freehire replaced hand-built LinkedIn/Indeed scrapers (1 Nov 2026).** Those worked, but every hour spent beating
  each site's anti-bot measures was an hour not spent on the matching/scoring work that's actually the point.
  freehire is a public, keyless, cooperative API aggregating 200+ sources with no documented rate limit and no
  anti-scraping posture to work around. Full reasoning: `plans/jobs-freehire-source.md`.
- **Countries and Skip companies are owner-set `job_preferences` fields, not silently derived from the Profile.**
  An earlier version filtered by the Profile's country without any visible control or filter chip for it — 103
  postings were hidden with no way to see why. The fix: Countries and Skip companies are real, editable preferences
  (`preferences-store.ts`), and the filter sidebar is the only source of filtering, full stop.
- **A strict filter only fires when it's genuinely narrowed, never on mere inclusion.** The work-setup mismatch on a
  posting's detail page used to fire whenever Remote was merely one of the owner's accepted setups, even if Hybrid
  and On-site were accepted too — that's "no restriction expressed," not a preference for Remote. It only fires now
  when the owner has narrowed to Remote alone (`requirement-mismatches.ts`).
- **A missing Profile fact is `null`, never a verified `0`.** Years-of-experience mismatches only show when the
  Profile actually has Experience entries to compare against; an empty Experience section means "no data," not "0
  years confirmed" (`years-of-experience.ts`, `requirement-mismatches.ts`).
- **freehire's search API truncates `description` at ~1000 characters with no signal it's a preview.** Confirmed
  directly against the live API: the same posting's detail endpoint (`/api/v1/jobs/{slug}`) returns the complete
  text. `check-freehire.ts`'s `savePostings` takes an injected `fetchFullDescription`, called once per genuinely-new
  posting (not on every poll, which is mostly repeats) to fetch the complete description before it's stored.
- **"Sourced from freehire" told the owner nothing — every posting goes through freehire.** freehire's own `source`
  field names the real ATS/board a posting came from (Greenhouse, Workday, Lever, a regional board, etc). That field
  is now stored as `originBoard` and surfaced on the detail page and as a one-off `?board=` filter on `/jobs`
  (`job-boards.ts`).
- **Skills matching is three-way, not binary.** `skills-match.ts` classifies each posting skill as have / related (to
  something the owner's Profile does list) / missing, backed by a hand-maintained dictionary (`skills-dictionary.ts`)
  of names, aliases, and logo slugs, since there's no API for "is React related to Next.js."
- **Jobs is the sidebar's entry point, not a parent with sub-items.** "New" was the Jobs landing page under another
  name; "Filtered out" is already one click away from the results bar's own hidden-count link. Both sub-items were
  removed from `workspace-shell.tsx`'s `jobs` module entry.
- **The empty state is a real Overview, not two lines of text**, drawn in
  `docs/mockups/jobs-redesign-canvas/Overview.dc.html`. A first visit with no postings yet already knew whether
  the pipeline was configured and running; the owner had to go check that outside the app. `overview.tsx` (zero
  postings) and `status-strip.tsx` (once postings exist, with a toggle back to the full `SetupStatusPanel`) show
  the same three facts -- Roles, Preferences, Last checked -- so "is this working?" has an answer on the page.
- **"Last checked" is four states, not ok/fail** (`format-check-status.ts`'s `describeCheckStatus`, matching
  `Last-checked.dc.html`): Never (no row yet), Working (a recent success), Failing (the latest call failed --
  this wins over staleness, since a known failure is more actionable than "it's been a while"), and Late (the
  latest call succeeded but nothing newer has arrived in 5+ minutes, so the scheduler may have quietly stopped).
  The `job_check_status` table (`check-status-store.ts`) is written by `check/freehire/route.ts` on every call
  it gets, including a bad secret. `lastOkAt` only moves forward on success, so a run of failures never erases
  when the pipeline last actually worked; `checkCount`/`firstCheckedAt` back "Checked 1,412 times since Oct 31".
- **The Preferences row reads real values, not a count** (`preferences-summary.ts`): the same "only show a
  dimension when it's actually excluding something" rule as `activeFilterChips`, so "Defaults" vs "Custom" is a
  deep-equal check against `preferences-defaults.ts`'s `DEFAULTS` -- kept in its own module with no database
  import, since a value import of `DEFAULTS` from `preferences-store.ts` would pull the Postgres driver into
  `jobs-page.tsx`'s client bundle (`next build` catches this; a `type`-only import doesn't).
- **Roles are editable from the filter sidebar** (`filter-sidebar.tsx`, 3 Nov 2026): "Import from Profile" merges
  in whatever `roles.ts` derives from the headline and last two titles, and `ChipField` (already shared with Skip
  words/Skip companies) lets the owner add or remove one by hand. This replaced a dead end where the Overview's
  "Roles: None yet" row only told the owner to go edit Profile, with no action on the page itself.

## Architecture notes

- **Pipeline is two injected-dependency stages**, both testable without a real HTTP call, AI call, or database:
  `check-freehire.ts` (search freehire, save new postings) and `process.ts` (read, extract, score pending postings
  in batches of 5). `pipeline.ts` wraps each stage for one account (`scrapeFreehireForUser`,
  `processUserPostings`); the scheduler routes loop that over every account with saved Jobs settings, and the
  "Run pipeline" button calls it for just the signed-in account, so the two never disagree about what one
  account's run does.
- **`listUsersWithPreferences` (`preferences-store.ts`) decides who gets polled**: any account that has saved
  Jobs settings at least once, i.e. has a `job_preferences` row. Visiting the Jobs page without saving never
  opts an account in, so the scheduler never runs AI calls against someone who's just curious.
- **`savePostings` re-verifies "genuinely new" inside its own transaction**, not just in the cheap pre-check that
  decides whether to spend a `fetchFullDescription` call — a normal poll is mostly duplicates, so the expensive path
  only runs for postings that turn out to actually be new.
- **Every strict filter and mismatch check is a plain comparison against already-extracted fields, no AI call at
  filter time.** The AI call happens once, in `process.ts`, when a posting is first read.
- **`PostingView`/`POSTING_COLUMNS` in `store.ts`** is the one place a new column needs to be added for it to reach
  the UI; `getRelatedPostings` and `getRelatedByRole` back the detail page's two "more like this" sections.

## Production setup (different from local dev)

Locally, `pnpm dev` runs `scripts/dev-with-poll.ts`, which starts `next dev` and polls
`/api/jobs/check/freehire` + `/api/jobs/process` once a minute on its own — no separate scheduled task to set up or
tear down, no cron to remember to disable when you're done for the day.

Production has no built-in scheduler doing this:

- An **outside scheduler** (not a Vercel cron — the once-a-minute cadence needs the Pro plan) must call
  `GET /api/jobs/check/freehire` and `GET /api/jobs/process` once a minute, each with header
  `x-jobs-check-secret: <JOBS_CHECK_SECRET>`. A free service like cron-job.org works; so does any always-on process
  that can fire an HTTP request on a timer.
- **`JOBS_CHECK_SECRET`** must be set in the production environment and must match what the scheduler sends. A
  request without it is rejected and runs nothing (`apps/web/.env.example`).
- Each run covers every account that has saved Jobs settings, not one hardcoded account — `OWNER_EMAIL` plays no
  part in this pipeline any more.
- Both routes return `503` if the secret env var is missing, so a misconfigured deploy fails loudly instead of
  silently finding no postings.
