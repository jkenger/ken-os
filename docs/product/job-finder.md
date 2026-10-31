# Jobs

Status: release step 1 (Receive and list) built, see `plans/jobs-receive-and-list.md`. Direct scraping (step 2 below)
proposed 31 Oct 2026, not yet built. Decisions below were agreed with the owner in chat on 28 Oct 2026, except where
marked otherwise.

## The idea in one line

Loots collects new postings from LinkedIn, Indeed and OnlineJobs, scores each one against the Profile, and lists the
matches on a Jobs page and by email, as soon as they come in.

## Decisions

| Question            | Decision                                                                                                                                                                                                                                |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sources             | LinkedIn and Indeed through direct scraping, with their own job alert emails as fallback (reversed 31 Oct 2026, see Getting postings in). OnlineJobs through its alerts if it sends them, otherwise a checker (see OnlineJobs below).   |
| Getting postings in | LinkedIn's and Indeed's own search endpoints, polled every minute, are the primary path. A Gmail filter forwarding alert emails to a Loots address on Resend is the fallback for when a source is blocked. No Gmail sign-in either way. |
| Email service       | Resend, for receiving the forwarded alerts and for sending Loots' own emails. Decided 28 Oct 2026.                                                                                                                                      |
| What to look for    | Roles come from the Profile automatically. No company watchlist.                                                                                                                                                                        |
| Working hours       | Each posting is labelled Day shift, Mid shift, Night shift, Flexible or Not listed, in Philippine time. Shown, never used to hide a posting.                                                                                            |
| Strict filters      | Pay, job type, work setup and country hide a posting, but hidden postings stay viewable under Filtered out with the reason. Nothing disappears silently.                                                                                |
| Missing information | A posting that doesn't say (no pay listed, no hours) is kept and marked Not listed, never hidden.                                                                                                                                       |
| Preferences         | Every preference is a setting on the Jobs page, with the defaults below.                                                                                                                                                                |
| Where results go    | The Jobs page, an email for each strong match, and a daily digest email.                                                                                                                                                                |

## Getting postings in

**Decided 31 Oct 2026, reverses the decision below.** Direct scraping is the primary path for LinkedIn and Indeed,
using the technique [JobSpy](https://github.com/speedyapply/JobSpy) uses: LinkedIn's signed-out guest search endpoint
and Indeed's mobile-app GraphQL API (see How they get listings below). The alert-email path built in release step 1
keeps running unchanged as the fallback, not replaced: `job_postings`/`job_posting_sources` already dedup a posting
seen from more than one source, so running both costs nothing and only matters when scraping is blocked or a site's
markup changes before the adapter is fixed.

- **Speed was the deciding factor.** Neither site offers a public real-time feed: Indeed's Publisher API closed to new
  users in 2022 and was retired in 2024; LinkedIn has never had one. Polling is the only option, and the limit on
  "fast" is the scheduler, not the scraper: [cron-job.org](https://cron-job.org) runs a free job every minute. Calling
  `/api/jobs/check/linkedin` and `/api/jobs/check/indeed` on that cadence gets a posting onto `/jobs` roughly a minute
  after it appears on the site, against hours for an alert email.
- **One client, many adapters, unchanged.** A scraper is just another `RawPosting` source, same as the LinkedIn and
  Indeed email parsers and the OnlineJobs checker. It reuses the same source-ID prefixes (`li-`, `in-`) the email
  parsers already use, so a posting scraped and later also forwarded by email collapses into the one row the existing
  dedup already produces, instead of a parallel code path.
- **Search terms.** Each poll searches with the owner's Alert keywords (`alertKeywords(roles)`, already built for
  Settings), one request per role.
- **Block handling.** Same stop rule as the OnlineJobs checker below: a 403 or 429 stops that source for 24 hours.
  Settings shows each source's state (Running, or Blocked until a time). The alert-email fallback keeps delivering
  that source's postings during the block, so a block degrades speed, not coverage.
- **Risk accepted 31 Oct 2026 (owner, in chat).** Scraping LinkedIn's and Indeed's own endpoints without signing in
  breaks each site's terms of service. The likely consequence of a block is the same as OnlineJobs': that source's
  checker stops for 24 hours. Neither scraper signs in, so the owner's LinkedIn or Indeed account isn't involved.

### Why alert emails (the original decision, now the fallback)

- LinkedIn and Indeed forbid scraping and block it quickly. Their alert emails are allowed and arrive on their own.
- Forwarding avoids Gmail's read-mail permission. Without Google's app verification, that permission signs Loots out
  every 7 days.
- The cost: postings arrive as fast as each site sends alerts, usually hours, not minutes. Each alert should be set to
  the most frequent option the site offers.

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

This is also the fastest source: 30 minutes at most, against hours for the alert emails.

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
whenever a site changes its app or its checks, which is why the alert-email path stays as the fallback rather than
being removed.

### What Loots borrows

- **One adapter per source, one posting shape.** JobOps gives each source its own package with a manifest, its own
  tests, and the same output shape. In Loots, the LinkedIn email parser, the Indeed email parser, the LinkedIn and
  Indeed scrapers, and the OnlineJobs checker each turn their input into the same `RawPosting`, and everything after
  step 3 below never knows the source.
- **Stop rules for paging.** Stop at the first posting already seen, when a page has no new IDs, or when a page has
  fewer cards than a full page.
- **Spotting a block.** A page that should have postings but has none is treated as "probably blocked or changed", not
  "no new jobs".
- **Repeat check by the source's own ID**, prefixed by source (`li-123`, `oj-1757483`).
- **Parser tests on saved pages.** A saved copy of each email or page goes in the tests, so a layout change fails a
  test instead of quietly finding nothing.
- **Guessing remote from the title and location** when a posting has no remote field, as JobSpy does; here the
  extract step does it and marks it as a guess.

## How it works

1. **Receive.** Resend receives each forwarded email and calls `/api/jobs/inbound` with it. Loots checks Resend's
   webhook signature and that the original sender is a known alert address, then stores the raw email. The LinkedIn
   and Indeed scrapers and the OnlineJobs checker, if built, feed postings in at step 3 instead, each on its own
   `/api/jobs/check/<source>` schedule.
2. **Split.** Each alert email lists several postings. A parser per source pulls out title, company, location, snippet
   and link.
3. **Drop repeats.** The same posting can arrive from two sources or two alerts. Postings are matched on the source's
   job ID when there is one, otherwise on title, company and location together.
4. **Read the full posting.** For postings that pass the strict filters on the email or list fields alone, Loots opens
   the public posting page once to read the whole description. If the page can't be read (Indeed often blocks it), the
   posting is scored from what it has and marked Partial.
5. **Extract.** AI reads the posting and fills structured fields: pay (amount, currency, period), job type, work setup,
   countries allowed, required hours and time zone, seniority, years required. Anything not stated is left empty, never
   guessed.
6. **Filter.** Plain code checks the strict filters below. A posting that fails one goes to Filtered out with the reason.
7. **Score.** AI compares the posting with the Profile and returns a score from 0 to 100, why it fits, what's missing,
   and the lines from the posting that back each point.
8. **Shift.** Code converts the posting's required hours to Philippine time and labels the shift (see Working hours).
9. **Notify.** A score at or above the instant line sends one email right away. Everything new goes into the daily
   digest.

Both AI jobs follow the structured-output pattern in `packages/agents`: a zod schema as output, a prompt version saved
with each result, and posting text treated as untrusted data. Postings are written by strangers, so the AI never gets
tools and nothing in a posting can change a setting.

## Roles from the Profile

- Loots builds the roles to look for from the Profile: the headline, the last two job titles, and the skill groups.
- The Jobs settings show these as Roles, read from the Profile, with Alert keywords to copy into LinkedIn, Indeed and
  OnlineJobs when setting up alerts. The OnlineJobs checker filters with the same keywords.
- A Profile change rescores open postings.
- Later: the Profile page gets its own job preferences section, and Jobs reads from there.

## Preferences

The owner's defaults, plus the fields this spec adds. All live in Jobs settings.

| Setting            | Default                 | Strict filter or shown | Notes                                                       |
| ------------------ | ----------------------- | ---------------------- | ----------------------------------------------------------- |
| Minimum pay        | Empty until set         | Strict                 | Needs currency and period too                               |
| Pay currency       | USD                     | Part of Minimum pay    | Postings in another currency are converted at a daily rate  |
| Pay period         | Per month               | Part of Minimum pay    | Hourly and yearly postings are converted to it              |
| Job type           | Full time, Contract     | Strict                 | Part time is the third choice                               |
| Work setup         | Remote                  | Strict                 | Hybrid and On site are the other choices                    |
| Countries          | US, AU, UK              | Strict                 | Which employers or markets to show                          |
| Shifts             | Day, Mid                | Shown                  | Night shift postings are marked Outside shifts              |
| Seniority          | Mid, Senior             | Shown in the score     | Junior and Lead are the other choices                       |
| Skip words         | Empty                   | Strict                 | Titles or words that always hide a posting, such as "Sales" |
| Skip companies     | Empty                   | Strict                 | Companies to always hide, such as a current employer        |
| Agencies           | Show                    | Strict when Hide       | Recruiting agencies and staffing firms                      |
| Posted within      | 14 days                 | Strict                 | Reposts keep the first date seen                            |
| Instant email from | Score 80                | n/a                    | Below this, postings wait for the digest                    |
| Digest time        | 7:00 AM Philippine time | n/a                    |                                                             |

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
- **Side panel for one posting:** why it fits, what's missing, the posting text, Open posting, Save, Mark applied,
  Dismiss with a reason. Dismiss asks for one of Not interested, Wrong seniority, Already applied elsewhere, Other
  (with a short text field), before moving the posting to Dismissed. A Filtered out posting shows which filter hid
  it, and Show anyway moves it to New. A Dismissed posting shows the reason, and Undo moves it back to New.
- **Settings:** the preferences table above, Roles from the Profile, Alert keywords, the address to forward to, and
  each scraped source's state (Running, Blocked until a date): LinkedIn and Indeed, plus the OnlineJobs checker's
  state if it is built.
- **Setup checklist** before the first posting arrives: copy the forwarding address, add the Gmail filter, set up
  alerts on each site.

The mockup brief is [docs/mockups/job-finder.md](../mockups/job-finder.md).

## Emails

All through Resend. Loots sends and receives no email today, so this adds the first of both.

- **Receiving:** a Loots address on a subdomain the owner controls, with its MX records pointed at Resend. Resend calls
  `/api/jobs/inbound` for each email; Loots verifies the webhook signature before reading it.
- **Strong match:** one posting, subject "92 · Senior Frontend Engineer, Acme". Body: score, pay, type, setup, shift,
  why it fits, and a link to the posting in Loots.
- **Daily digest:** new postings since the last digest, grouped by score, plus how many were filtered out and why.
- **Checker problems:** one email when a scraped source (LinkedIn, Indeed, or the OnlineJobs checker if built) gets
  blocked or stops finding postings.
- New in `.env.example`: `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `JOBS_INBOUND_ADDRESS`, and `JOBS_CHECK_SECRET`
  (shared by every `/api/jobs/check/<source>` route; required from release step 2, not just if the OnlineJobs checker
  is built).

## Storage

New tables, added in one migration. Nothing existing changes.

- `job_preferences`: one row per owner, the settings as `jsonb`.
- `job_inbound_emails`: each forwarded email as received, so parsing can be rerun after a parser fix.
- `job_postings`: one row per real posting after repeats are dropped, with the extracted fields and every source it
  came from.
- `job_matches`: the score, reasons, shift and the owner's state (New, Saved, Applied, Dismissed, Filtered out) for
  each posting, with the prompt version and the Profile version it was scored against.
- `job_scraper_state`: one row per scraped source (`linkedin`, `indeed`, later `onlinejobs` if the checker is built),
  the last run's time and result (OK, Blocked, Empty), and `blockedUntil` when a 403 or 429 stopped it.

## Release steps

1. **Receive and list.** Resend receiving, LinkedIn and Indeed parsers, repeat dropping, the Jobs page with New and
   Filtered out, and settings. No AI yet: filters run on the email fields. Built, see `plans/jobs-receive-and-list.md`.
2. **Direct scraping.** LinkedIn and Indeed scrapers polled every minute as the primary path; the alert-email path
   from step 1 stays as the fallback. Decided 31 Oct 2026, see Getting postings in.
3. **Score.** Full posting read, AI extract and score, shift labels, the side panel.
4. **Email.** Strong match emails and the daily digest.
5. **OnlineJobs.** Its alert parser if it sends alerts; otherwise the checker, if the owner accepts the risk.
6. **Act on a match.** Saved and Applied, Dismiss with a reason, and Dismiss reasons turned into suggested filter
   changes the owner approves.

Later, not in these steps: a resume tailored to one posting, built from the Profile like the other resumes; a cover note
draft; a gap check across many postings ("6 of your top 10 ask for AWS").

## Acceptance criteria

- A forwarded LinkedIn or Indeed alert shows its postings on `/jobs` within one minute of arriving.
- An email with a bad webhook signature, or whose original sender isn't a known alert address, is rejected and stored
  nowhere.
- The same posting from two alerts or two sources shows once, listing every source.
- A posting below Minimum pay shows under Filtered out with "Below minimum pay"; one with no pay shows under New marked
  Not listed.
- Every posting shows a shift label. A UK 9 to 5 shows Mid shift, 5 PM to 1 AM. No posting is hidden for its shift.
- Changing a setting refilters existing postings without a new alert.
- A score of 80 or more sends exactly one email; scoring the same posting again sends none.
- Nothing in a posting's text can change a setting, send an email or reach a tool.
- If built, the OnlineJobs checker never sends two requests less than 5 seconds apart, never signs in, and stops for 24
  hours after a 403 or 429.
- A posting scraped from LinkedIn or Indeed shows on `/jobs` within about a minute of being scraped, without waiting
  for an alert email.
- A posting seen through scraping and also through the alert-email path, in either order, shows once, listing both.
- A 403 or 429 from a LinkedIn or Indeed scrape stops that source for 24 hours; the alert-email path keeps delivering
  that source's postings during the block.
- A `/api/jobs/check/<source>` call without the correct `JOBS_CHECK_SECRET` is rejected and runs nothing.
- The LinkedIn and Indeed scrapers never sign in and never submit anything; both are read-only requests to each
  site's own guest or app endpoint.

## Open questions

- Whether OnlineJobs Job alerts send emails. The owner checks after signing in; this decides whether step 5 builds a
  parser or the checker.
- If the checker is needed: whether the owner accepts the terms risk (the same risk already accepted for LinkedIn and
  Indeed scraping, see Getting postings in).
