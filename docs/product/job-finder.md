# Jobs

Status: step 1 (Receive and list) and step 2 (Score) built, 1 Nov 2026. Supersedes the direct-scraping plan
(`plans/jobs-direct-scraping.md`, superseded) and the earlier alert-email receiving plan
(`plans/jobs-receive-and-list.md`, removed): hand-built LinkedIn/Indeed scrapers were replaced with
[freehire](https://github.com/strelov1/freehire), an open-source job search API already aggregating 4.78M+
postings from 421 sources including real ATS platforms, freeing the effort for CV tailoring and smart matching
instead (`plans/jobs-freehire-source.md`). Decisions below were agreed with the owner in chat on 28 Oct 2026,
except where marked otherwise.

## The idea in one line

Loots collects new postings from freehire and OnlineJobs, scores each one against the Profile, and lists the
matches on a Jobs page and by email, as soon as they come in.

## Decisions

| Question            | Decision                                                                                                                                                                                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sources             | freehire's public search API, polled every minute, no alert-email path (replaced LinkedIn/Indeed direct scraping 1 Nov 2026, see Getting postings in). OnlineJobs through its alerts if it sends them, otherwise a checker (see OnlineJobs below). |
| Getting postings in | freehire's public search API, polled every minute. No Gmail filter, no forwarding address, no Gmail sign-in, no per-source block/backoff to manage: scraping needs nothing from the owner beyond a Profile headline.                               |
| Email service       | Resend, for sending Loots' own emails (strong match, daily digest). Decided 28 Oct 2026.                                                                                                                                                           |
| What to look for    | Roles come from the Profile automatically. No company watchlist.                                                                                                                                                                                   |
| Working hours       | Each posting is labelled Day shift, Mid shift, Night shift, Flexible or Not listed, in Philippine time. Shown, never used to hide a posting.                                                                                                       |
| Strict filters      | Pay, job type, work setup and country hide a posting, but hidden postings stay viewable under Filtered out with the reason. Nothing disappears silently.                                                                                           |
| Missing information | A posting that doesn't say (no pay listed, no hours) is kept and marked Not listed, never hidden.                                                                                                                                                  |
| Preferences         | Every preference is a setting on the Jobs page, with the defaults below.                                                                                                                                                                           |
| Where results go    | The Jobs page, an email for each strong match, and a daily digest email.                                                                                                                                                                           |

## Getting postings in

**Decided 1 Nov 2026, replaces direct LinkedIn/Indeed scraping.** Hand-built scrapers against LinkedIn's signed-out
guest search endpoint and Indeed's mobile-app GraphQL API worked, but every hour spent fighting each site's
anti-bot measures (block detection, 24-hour backoff, terms-of-service risk) was an hour not spent on CV tailoring
or smart matching, which the owner decided to prioritize instead. [freehire](https://github.com/strelov1/freehire)
(MIT-licensed, self-hostable, verified live before adopting it) already aggregates 4.78M+ open postings from 421
sources, 160 of them real ATS platforms (Workday, Greenhouse, Lever, iCIMS), via a public, keyless, cooperative
search API with no documented rate limit and no anti-scraping posture to work around. Full migration details and
the reasoning behind each decision: `plans/jobs-freehire-source.md`.

- **One search call per role, once a minute.** `/api/jobs/check/freehire` (polled by an outside scheduler, same
  cadence as before) searches freehire with the owner's roles (`deriveRoles(profile)`, already built for Settings),
  getting a posting onto `/jobs` roughly a minute after freehire itself has it.
- **No full-page fetch needed.** Every freehire result already carries the posting's full description inline, so
  there's no separate "read the full posting" step the way LinkedIn/Indeed needed (see How it works below) — a
  posting is never Partial for lacking a full read.
- **No block/backoff state.** freehire is a cooperative, public API, not a site actively trying to stop scraping.
  A failed request is skipped and retried next poll; there is no block-tracking table or Settings badge for it
  anymore (`job_scraper_state` was removed).
- **Structured fields, not just prose.** freehire's own data includes per-posting `countries`, `work_mode`, and an
  `enrichment` object (salary, employment type, minimum experience) that the extraction step trusts directly when
  present, only falling back to its own AI reading of the posting's text when freehire doesn't state a field.
  LinkedIn and Indeed never carried this data at all (confirmed against
  [JobSpy](https://github.com/speedyapply/JobSpy)'s own source), which is part of why Countries filtering used to
  need "show by default when unstated" as its fallback — most LinkedIn/Indeed postings never stated anything.

## OnlineJobs

What was checked on 28 Oct 2026:

- There is a **Job alerts** page for signed-in jobseekers at `https://v2.onlinejobs.ph/jobseeker/job-alerts`. Whether
  it sends emails, and how often, can only be seen after signing in.
- The job search at `https://www.onlinejobs.ph/jobseekers/jobsearch` is public, newest first, 30 postings a page. Each
  shows title, posted date and time, pay as free text ("$1500", "Negotiable", "₱170 to ₱300 per hour") and a link
  `/jobseekers/job/<slug>-<id>`. There is no RSS feed or API.
- `robots.txt` lets crawlers in with a 5 second gap between requests.
- The terms (section 7.4) ask for use "without the use of any automated means", unless OnlineJobs allows it.

**First choice: its own alerts.** The owner signs in and sets up Job alerts. If they arrive by email, they go through
the same Gmail forward as LinkedIn and Indeed, and nothing below is built.

**Fallback: a checker.** Only if OnlineJobs sends no alert emails, and only once the owner accepts the risk below.

- Reads the public search page only, never signs in, so the owner's OnlineJobs account is never used.
- Every 30 minutes, reads page 1 (the 30 newest postings) and stops at the first posting it has already seen.
- Opens a posting's own page only when it is new and passes the strict filters on the list fields, at most 20 a run.
- Waits at least 5 seconds between requests, as `robots.txt` asks, and sends a plain user agent naming Loots.
- On a block or rate limit (403 or 429), stops for 24 hours. When a run finds no postings twice in a row, the page
  layout has probably changed: it stops and emails the owner.
- The parser is tested against a saved copy of the search page, so a layout change shows up as a failing test.
- Runs from `/api/jobs/check/onlinejobs`, called with a secret by a scheduler. A Vercel cron every 30 minutes needs
  the Pro plan; on Hobby, an outside scheduler such as cron-job.org calls it instead.

**Risk of the fallback.** It goes against section 7.4 of the OnlineJobs terms, even at this low rate. The likely
consequence is OnlineJobs blocking the server's address, which ends the checker; the owner's jobseeker account isn't
involved because the checker never signs in. The owner decides whether to build it.

30 minutes at most is slower than the LinkedIn and Indeed scrapers' 1-minute poll; OnlineJobs' own search page doesn't
support a tighter interval without added risk, so this stays the slowest of the three sources if it's built.

## Existing tools

Checked 28 Oct 2026. Jobs stays in Loots: no open tool reads the Profile, sends instant alerts, or covers OnlineJobs.

| Tool                                                     | What it is                                                                                                                                                            | License                    |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| [JobOps](https://github.com/DaKheera47/job-ops)          | Self-hosted Next.js app: searches about 13 boards, AI fit score 0 to 100, tailored CVs, application tracker, reads Gmail for replies. No job alerts. About 4.1k stars | AGPLv3 with Commons Clause |
| [JobSpy](https://github.com/speedyapply/JobSpy)          | Python scraping library for LinkedIn, Indeed, Glassdoor, ZipRecruiter and others. JobOps uses it for its big boards. About 4.6k stars                                 | MIT                        |
| [ts-jobspy](https://github.com/alpharomercoma/ts-jobspy) | TypeScript port of JobSpy for LinkedIn and Indeed. 7 stars, idle since Jan 2026                                                                                       | Not checked                |

Loots borrows ideas only. No code is copied from JobOps because of its license.

### How they get listings

Four patterns, from the cleanest to the one Loots won't use:

1. **Public search endpoint, no sign-in.** JobSpy's LinkedIn scraper calls the page LinkedIn uses to load more results
   for signed-out visitors (`/jobs-guest/jobs/api/seeMoreJobPostings/search`), with `keywords`, `location`, a time
   filter (`f_TPR=r<seconds>`) and a `start` offset. It returns HTML cards, read with CSS selectors. The full
   description comes from one visit to `/jobs/view/<id>`. It waits 3 to 7 seconds between pages.
2. **Pretending to be the phone app.** JobSpy's Indeed scraper posts GraphQL queries to `apis.indeed.com/graphql`
   with the Indeed iPhone app's fixed key and user agent, 100 results a page, with filters for date, remote and job
   type.
3. **Stealth browser.** JobOps' Hiring Cafe extractor drives a disguised Firefox (Camoufox), and switches to a visible
   window when it meets a bot check.
4. **Rotating proxies.** Both send requests through a pool of addresses so a block on one doesn't stop the run.

Loots uses pattern 1 for LinkedIn and OnlineJobs, and pattern 2 for Indeed (decided 31 Oct 2026, see Getting postings
in). Patterns 3 and 4 stay ruled out: a stealth browser and rotating proxies are real infrastructure to run and
maintain, and nothing here needs them yet. Both adopted patterns still break the sites' terms, and still break
whenever a site changes its app or its checks; the owner accepts that risk directly rather than keeping a slower
fallback running against it.

### What Loots borrows

- **One adapter per source, one posting shape.** JobOps gives each source its own package with a manifest, its own
  tests, and the same output shape. In Loots, the LinkedIn and Indeed scrapers and the OnlineJobs checker each turn
  their input into the same `RawPosting`, and everything after dedup never knows the source.
- **Stop rules for paging.** Stop at the first posting already seen, when a page has no new IDs, or when a page has
  fewer cards than a full page.
- **Spotting a block.** A page that should have postings but has none is treated as "probably blocked or changed", not
  "no new jobs".
- **Repeat check by the source's own ID**, prefixed by source (`li-123`, `oj-1757483`).
- **Parser tests on saved pages.** A saved copy of each endpoint's response goes in the tests, so a layout or API
  change fails a test instead of quietly finding nothing.
- **Guessing remote from the title and location** when a posting has no remote field, as JobSpy does; here the
  extract step does it and marks it as a guess.

## How it works

1. **Search.** `/api/jobs/check/freehire` (called by an outside scheduler, once a minute) searches freehire with
   each of the owner's roles and turns every result directly into a `RawPosting`: title, company, location, link,
   full description, a source ID, and freehire's own structured countries/work-mode/salary fields when it states
   them.
2. **Drop repeats.** The same posting can arrive from two polls, or (rarely) from more than one of freehire's own
   underlying sources. Postings are matched on the source's job ID when there is one, otherwise on title, company
   and location together.
3. **Extract.** One AI call reads the posting's full text (already present from step 1 — no separate full-page
   fetch) and fills structured fields: pay (amount, currency, period), job type, work setup, countries allowed,
   required hours and time zone, seniority, years required, and a 2-3 sentence summary. Anything not stated is left
   empty, never guessed. When freehire's own data already states a field (countries, work mode, employment type,
   salary), that's trusted directly instead of the AI's own reading of the same prose.
4. **Filter.** Plain code checks the strict filters below. A posting that fails one goes to Filtered out with the reason.
5. **Score.** A second AI call compares the extracted posting with the Profile and returns a score from 0 to 100,
   why it fits, what's missing, and the lines from the posting that back each point.
6. **Shift.** Code converts the posting's required hours to Philippine time and labels the shift (see Working hours).
7. **Notify.** A score at or above the instant line sends one email right away. Everything new goes into the daily
   digest.

Both AI jobs follow the structured-output pattern in `packages/agents`: a zod schema as output, a prompt version saved
with each result, and posting text treated as untrusted data. Postings are written by strangers, so the AI never gets
tools and nothing in a posting can change a setting.

## Roles from the Profile

- Loots builds the roles to look for from the Profile: the headline, the last two job titles, and the skill groups.
- The Jobs settings show these as Roles, read from the Profile. freehire, and the OnlineJobs checker if built, each
  search with them directly, one request per role: no alert setup on any site.
- A Profile change rescores open postings.
- Later: the Profile page gets its own job preferences section, and Jobs reads from there.

## Preferences

The owner's defaults, plus the fields this spec adds. All live in Jobs settings.

| Setting            | Default                 | Strict filter or shown      | Notes                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Minimum pay        | Empty until set         | Strict                      | Needs currency and period too                                                                                                                                                                                                                                              |
| Maximum pay        | Empty until set         | Strict                      | Same currency and period as Minimum pay                                                                                                                                                                                                                                    |
| Pay currency       | USD                     | Part of Minimum/Maximum pay | Postings in another currency are converted at a cached rate                                                                                                                                                                                                                |
| Pay period         | Per month               | Part of Minimum/Maximum pay | Hourly and yearly postings are converted to it                                                                                                                                                                                                                             |
| Job type           | Full time, Contract     | Strict                      | Part time is the third choice                                                                                                                                                                                                                                              |
| Work setup         | Remote                  | Strict                      | Hybrid and On site are the other choices                                                                                                                                                                                                                                   |
| Countries          | Empty                   | Strict                      | Owner-set, free text, same style as Skip words. Empty means no restriction at all. A posting that explicitly lists countries excluding every one of the owner's chosen countries is filtered; one that states nothing, or says it's open to everyone, is shown either way. |
| Shifts             | Day, Mid                | Shown                       | Night shift postings are marked Outside shifts                                                                                                                                                                                                                             |
| Seniority          | Mid, Senior             | Shown in the score          | Junior and Lead are the other choices                                                                                                                                                                                                                                      |
| Skip words         | Empty                   | Strict                      | Titles or words that always hide a posting, such as "Sales"                                                                                                                                                                                                                |
| Skip companies     | Empty                   | Strict                      | Companies to always hide, such as a current employer                                                                                                                                                                                                                       |
| Agencies           | Show                    | Strict when Hide            | Recruiting agencies and staffing firms                                                                                                                                                                                                                                     |
| Posted within      | 14 days                 | Strict                      | Reposts keep the first date seen                                                                                                                                                                                                                                           |
| Instant email from | Score 80                | n/a                         | Below this, postings wait for the digest                                                                                                                                                                                                                                   |
| Digest time        | 7:00 AM Philippine time | n/a                         |                                                                                                                                                                                                                                                                            |

Minimum pay with no pay listed on the posting: kept and marked Not listed.

## Working hours

The owner works a day or mid shift in the Philippines (UTC+8, no daylight saving), with no fixed hours. So instead of
counting overlap with set hours, each posting gets one label from the hours it needs, converted to Philippine time:

| Label       | Rule                                                                       |
| ----------- | -------------------------------------------------------------------------- |
| Day shift   | Every required hour falls between 6 AM and 7 PM                            |
| Mid shift   | Every required hour falls between 12 PM and 2 AM, and it isn't a Day shift |
| Night shift | Needs any hour between 2 AM and 6 AM, or doesn't fit either window         |
| Flexible    | The posting says hours are flexible, async, or the owner's choice          |
| Not listed  | The posting gives no hours or time zone                                    |

The row shows the label and the hours in Philippine time, such as "Mid shift, 5 PM to 1 AM". Labels never hide a
posting; the Jobs page can sort and filter by them.

What a normal 9 to 5 looks like on 28 Oct 2026:

| Market      | Their 9 to 5 in Philippine time | Label       |
| ----------- | ------------------------------- | ----------- |
| AU (Sydney) | 6 AM to 2 PM                    | Day shift   |
| UK (London) | 5 PM to 1 AM                    | Mid shift   |
| US East     | 9 PM to 5 AM (10 PM from 2 Nov) | Night shift |
| US West     | 12 AM to 8 AM (1 AM from 2 Nov) | Night shift |

A US posting becomes Mid shift when it asks only for part of the day, such as "overlap with EST until noon" (9 PM to
1 AM). The extract step looks for that wording and uses it instead of a plain 9 to 5. Daylight saving in the posting's
time zone is applied on the posting's date.

## The Jobs page

One page at `/jobs`, in the module column like Profile.

- **List:** New, Saved, Applied, Dismissed, Filtered out. Newest first, or by score or shift.
- **Each row:** title, company, source, how long ago it arrived, pay, job type, work setup, country, shift, score.
- **New vs Viewed:** a New-list card shows a "New" badge until the owner opens its detail page once, or until 3
  days pass since `job_postings.first_seen_at`, whichever comes first — most postings never get clicked (there's
  always more on the board than anyone opens one by one), so a click-only badge would keep showing New for
  months. Past 3 days unopened, the badge just quietly stops showing; `viewed_at` itself stays null (it only ever
  records an actual open, never the time-based expiry). Once opened, it's Viewed, which has no badge of its own
  — its absence is the signal, the same read/unread convention as an inbox. Tracked as `job_matches.viewed_at`,
  separate from the `state` column below: viewing never changes a posting's New/Filtered out/Saved/etc. state,
  and a Filtered out card never shows either badge, regardless of `viewed_at`. A posting "Show anyway"'d back
  into New keeps whatever `viewed_at` it already had — already-opened ones stay Viewed, never-opened ones run
  the same 3-day check again from their original `first_seen_at`. Counts, sort order and the list header total
  are unaffected.
- **Side panel for one posting:** why it fits, what's missing, the posting text, Open posting, Save, Mark applied,
  Dismiss with a reason. Dismiss asks for one of Not interested, Wrong seniority, Already applied elsewhere, Other
  (with a short text field), before moving the posting to Dismissed. A Filtered out posting shows which filter hid
  it, and Show anyway moves it to New. A Dismissed posting shows the reason, and Undo moves it back to New.
- **Settings:** the preferences table above, Roles from the Profile, and freehire listed as the source (no
  Running/Blocked state to show — freehire has no block/backoff concept). The OnlineJobs checker's own state, if it
  is built, will still need one, since OnlineJobs-style blocking applies to it.
- **Before the first posting arrives:** a match-preferences form, not a setup checklist (decided 31 Oct 2026, replaces
  the removed alert-email checklist). Scraping needs nothing from the owner beyond a Profile headline, but matching
  needs a few numbers no scraper can guess, so the form asks for exactly those: Roles (prefilled from the Profile,
  editable), Minimum pay (with currency and period) and Shifts. Saving it stores those Preferences
  fields and starts scraping; the rest of the Preferences table keeps its defaults until changed in Settings. If Roles
  is still empty after saving, the empty state asks for a Profile headline or job title instead; otherwise it says
  scraping is running and waiting for a match.

The mockup brief is [docs/mockups/job-finder.md](../mockups/job-finder.md).

## Emails

Through Resend, for sending only. Loots sends no email today, so this adds the first.

- **Strong match:** one posting, subject "92 · Senior Frontend Engineer, Acme". Body: score, pay, type, setup, shift,
  why it fits, and a link to the posting in Loots.
- **Daily digest:** new postings since the last digest, grouped by score, plus how many were filtered out and why.
- **Checker problems:** one email when a source stops finding postings (the OnlineJobs checker, if built, getting
  blocked; freehire itself has no block state to report, but a sustained empty result would still be worth a
  heads-up).
- New in `.env.example`: `RESEND_API_KEY` (sending, release step 4) and `JOBS_CHECK_SECRET` (shared by every
  `/api/jobs/check/<source>` route, required now).

## Storage

New tables, added in one migration. Nothing existing changes.

- `job_preferences`: one row per owner, the settings as `jsonb`.
- `job_postings`: one row per real posting after repeats are dropped, with the extracted fields and every source it
  came from.
- `job_matches`: the score, reasons, shift, the owner's state (New, Saved, Applied, Dismissed, Filtered out) and
  `viewed_at` (null until the owner opens the posting's detail page once) for each posting, with the prompt
  version and the Profile version it was scored against.

freehire needs no block/backoff state (no anti-scraping posture to track against) — the `job_scraper_state` table
this used to need for LinkedIn/Indeed was removed along with the scrapers themselves; `onlinejobs`, if the checker
is built, will need its own equivalent since it's a site LinkedIn/Indeed-style blocking still applies to.

## Release steps

1. **Receive and list.** ✅ Built, via freehire's search API (not the LinkedIn/Indeed direct scraping originally
   planned here — see Getting postings in). Repeat dropping, the Jobs page with New and Filtered out, and settings.
   `plans/jobs-freehire-source.md`.
2. **Score.** ✅ Built — full posting read, AI extract and score, shift labels, the side panel. `plans/jobs-score.md`.
3. **Email.** Strong match emails and the daily digest.
4. **OnlineJobs.** Its alert parser if it sends alerts; otherwise the checker, if the owner accepts the risk.
5. **Act on a match.** Saved and Applied, Dismiss with a reason, and Dismiss reasons turned into suggested filter
   changes the owner approves.

Later, not in these steps: a resume tailored to one posting, built from the Profile like the other resumes
(specified, see `docs/product/cv-tailoring.md`); a cover note draft; a gap check across many postings ("6 of your
top 10 ask for AWS").

## Acceptance criteria

- A first visit to `/jobs` with no saved Preferences shows the match-preferences form (Roles, Minimum pay,
  Shifts); saving it stores those fields and starts the freehire search, with no alert, Gmail or forwarding-address
  setup anywhere in the flow. (Countries is no longer an owner-set preference — see Preferences below.)
- A posting found by freehire shows on `/jobs` within about a minute of the search that found it.
- The same posting found again on a later poll shows once, not duplicated.
- A posting below Minimum pay shows under Filtered out with "Below minimum pay"; one with no pay shows under New marked
  Not listed.
- Every posting shows a shift label. A UK 9 to 5 shows Mid shift, 5 PM to 1 AM. No posting is hidden for its shift.
- Changing a setting refilters existing postings without a new search.
- A score of 80 or more sends exactly one email; scoring the same posting again sends none.
- Nothing in a posting's text can change a setting, send an email or reach a tool.
- If built, the OnlineJobs checker never sends two requests less than 5 seconds apart, never signs in, and stops for 24
  hours after a 403 or 429.
- A `/api/jobs/check/<source>` call without the correct `JOBS_CHECK_SECRET` is rejected and runs nothing.
- A New posting's card shows "New" until its detail page has been opened once (first open only — opening it again
  doesn't move the timestamp) or until 3 days pass since `first_seen_at`, whichever comes first; after either,
  no badge. A posting opened on day 2 never shows New again, even past day 3. A posting never opened stops
  showing New once it's 3 days old, with `viewed_at` still null. A Filtered out card never shows either badge,
  whether or not it's been opened. Opening a posting never changes the list header's count, sort order, or any
  other posting's state.

## Open questions

- Whether OnlineJobs Job alerts send emails. The owner checks after signing in; this decides whether step 5 builds a
  parser or the checker.
- If the checker is needed: whether the owner accepts the terms risk (the same risk already accepted for LinkedIn and
  Indeed scraping, see Getting postings in).
