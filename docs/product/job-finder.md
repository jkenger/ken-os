# Jobs

Status: proposed, 28 Oct 2026. Not built. Decisions below were agreed with the owner in chat on 28 Oct 2026.

## The idea in one line

Loots reads the job alert emails the owner already gets, scores each posting against the Profile, and lists the matches
on a Jobs page and by email, as soon as the alert arrives.

## Decisions

| Question            | Decision                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sources             | LinkedIn, Indeed and OnlineJobs, through their own job alert emails. No scraping of search pages.                                                        |
| Getting alerts in   | A Gmail filter forwards alert emails to a Loots inbound address. No Gmail sign-in.                                                                       |
| What to look for    | Roles come from the Profile automatically. No company watchlist.                                                                                         |
| Hours overlap       | Shown on every posting, never used to hide one. The owner decides.                                                                                       |
| Strict filters      | Pay, job type, work setup and country hide a posting, but hidden postings stay viewable under Filtered out with the reason. Nothing disappears silently. |
| Missing information | A posting that doesn't say (no pay listed, no hours) is kept and marked Not listed, never hidden.                                                        |
| Preferences         | Every preference is a setting on the Jobs page, with the defaults below.                                                                                 |
| Where results go    | The Jobs page, an email for each strong match, and a daily digest email.                                                                                 |

## Why alert emails

- LinkedIn and Indeed forbid scraping and block it quickly. Their alert emails are allowed and arrive on their own.
- Forwarding avoids Gmail's read-mail permission. Without Google's app verification, that permission signs Loots out
  every 7 days.
- The cost: postings arrive as fast as each site sends alerts, usually hours, not minutes. Each alert should be set to
  the most frequent option the site offers.

## How it works

1. **Receive.** The inbound email service (Postmark or Resend) posts each forwarded email to `/api/jobs/inbound`. Loots
   checks the webhook secret and that the original sender is a known alert address, then stores the raw email.
2. **Split.** Each alert email lists several postings. A parser per source pulls out title, company, location, snippet
   and link.
3. **Drop repeats.** The same posting can arrive from two sources or two alerts. Postings are matched on the source's
   job ID when there is one, otherwise on title, company and location together.
4. **Read the full posting.** For postings that pass step 5's filters on the email alone, Loots opens the public posting
   page once to read the whole description. If the page can't be read (Indeed often blocks it), the posting is scored
   from the email and marked Partial.
5. **Extract.** AI reads the posting and fills structured fields: pay (amount, currency, period), job type, work setup,
   countries allowed, required hours and time zone, seniority, years required. Anything not stated is left empty, never
   guessed.
6. **Filter.** Plain code checks the strict filters below. A posting that fails one goes to Filtered out with the reason.
7. **Score.** AI compares the posting with the Profile and returns a score from 0 to 100, why it fits, what's missing,
   and the lines from the posting that back each point.
8. **Hours overlap.** Code works out how many hours the posting's required hours overlap each of the owner's shifts,
   with daylight saving handled for both sides.
9. **Notify.** A score at or above the instant line sends one email right away. Everything new goes into the daily
   digest.

Both AI jobs follow the structured-output pattern in `packages/agents`: a zod schema as output, a prompt version saved
with each result, and posting text treated as untrusted data. Postings are written by strangers, so the AI never gets
tools and nothing in a posting can change a setting.

## Roles from the Profile

- Loots builds the roles to look for from the Profile: the headline, the last two job titles, and the skill groups.
- The Jobs settings show these as Roles, read from the Profile, with Alert keywords to copy into LinkedIn, Indeed and
  OnlineJobs when setting up alerts.
- A Profile change rescores open postings.
- Later: the Profile page gets its own job preferences section, and Jobs reads from there.

## Preferences

The owner's defaults, plus the fields this spec adds. All live in Jobs settings.

| Setting            | Default                    | Strict filter or shown | Notes                                                       |
| ------------------ | -------------------------- | ---------------------- | ----------------------------------------------------------- |
| Minimum pay        | Empty until set            | Strict                 | Needs currency and period too (see below)                   |
| Pay currency       | USD                        | Part of Minimum pay    | Postings in another currency are converted at a daily rate  |
| Pay period         | Per month                  | Part of Minimum pay    | Hourly and yearly postings are converted to it              |
| Job type           | Full time, Contract        | Strict                 | Part time is the third choice                               |
| Work setup         | Remote                     | Strict                 | Hybrid and On site are the other choices                    |
| Countries          | US, AU, UK                 | Strict                 | Which employers or markets to show                          |
| Your time zone     | From the Profile's country | Shown                  | Used for the overlap math                                   |
| Day shift          | 8:00 AM to 5:00 PM         | Shown                  | Owner to confirm                                            |
| Mid shift          | 3:00 PM to 12:00 AM        | Shown                  | Owner to confirm                                            |
| Seniority          | Mid, Senior                | Shown in the score     | Junior and Lead are the other choices                       |
| Skip words         | Empty                      | Strict                 | Titles or words that always hide a posting, such as "Sales" |
| Skip companies     | Empty                      | Strict                 | Companies to always hide, such as a current employer        |
| Agencies           | Show                       | Strict when Hide       | Recruiting agencies and staffing firms                      |
| Posted within      | 14 days                    | Strict                 | Reposts keep the first date seen                            |
| Instant email from | Score 80                   | n/a                    | Below this, postings wait for the digest                    |
| Digest time        | 7:00 AM, your time zone    | n/a                    |                                                             |

Minimum pay with no pay listed on the posting: kept and marked Not listed.

## Hours overlap

Shown as a count of hours and the better shift, such as "6h, Day shift" or "2h, Mid shift". Under 4 hours is marked but
never hidden, and the Jobs page can sort and filter by it.

What a normal 9 to 5 looks like for the Philippines (UTC+8) on 28 Oct 2026, with the default shifts:

| Market      | Their 9 to 5 in local time      | Day shift | Mid shift   |
| ----------- | ------------------------------- | --------- | ----------- |
| AU (Sydney) | 6 AM to 2 PM                    | 6h        | 0h          |
| UK (London) | 5 PM to 1 AM                    | 0h        | 7h          |
| US East     | 9 PM to 5 AM (10 PM from 2 Nov) | 0h        | 3h, then 2h |
| US West     | 12 AM to 8 AM (1 AM from 2 Nov) | 0h        | 0h          |

US roles reach 4 hours only when the posting allows early starts or flexible hours. The extract step looks for that
wording ("flexible hours", "overlap with EST until noon") and uses it instead of a plain 9 to 5.

## The Jobs page

One page at `/jobs`, in the module column like Profile.

- **List:** New, Saved, Applied, Filtered out. Newest first, or by score or overlap.
- **Each row:** title, company, source, how long ago it arrived, pay, job type, work setup, country, hours overlap,
  score.
- **Side panel for one posting:** why it fits, what's missing, the posting text, Open posting, Save, Mark applied,
  Dismiss with a reason. A Filtered out posting shows which filter hid it, and Show anyway moves it to New.
- **Settings:** the preferences table above, Roles from the Profile, Alert keywords, and the inbound address to forward
  to.
- **Setup checklist** before the first alert arrives: copy the forwarding address, add the Gmail filter, set up alerts
  on each site.

The mockup brief is [docs/mockups/job-finder.md](../mockups/job-finder.md).

## Emails

- **Strong match:** one posting, subject "92 · Senior Frontend Engineer, Acme". Body: score, pay, type, setup, overlap,
  why it fits, and a link to the posting in Loots.
- **Daily digest:** new postings since the last digest, grouped by score, plus how many were filtered out and why.
- Sent with Resend. Loots sends no email today, so this adds the first sender and an `RESEND_API_KEY` in
  `.env.example`.

## Storage

New tables, added in one migration. Nothing existing changes.

- `job_preferences`: one row per owner, the settings as `jsonb`.
- `job_inbound_emails`: each forwarded email as received, so parsing can be rerun after a parser fix.
- `job_postings`: one row per real posting after repeats are dropped, with the extracted fields and every source it
  came from.
- `job_matches`: the score, reasons, overlap and the owner's state (New, Saved, Applied, Dismissed, Filtered out) for
  each posting, with the prompt version and the Profile version it was scored against.

## Release steps

1. **Receive and list.** Inbound address, LinkedIn and Indeed parsers, repeat dropping, the Jobs page with New and
   Filtered out, and settings. No AI yet: filters run on the email fields.
2. **Score.** Full posting read, AI extract and score, hours overlap, the side panel.
3. **Email.** Strong match emails and the daily digest.
4. **Act on a match.** Saved and Applied, Dismiss with a reason, and Dismiss reasons turned into suggested filter
   changes the owner approves.

Later, not in these steps: a resume tailored to one posting, built from the Profile like the other resumes; a cover note
draft; a gap check across many postings ("6 of your top 10 ask for AWS").

## Acceptance criteria

- A forwarded LinkedIn or Indeed alert shows its postings on `/jobs` within one minute of arriving.
- An email that fails the webhook secret, or whose original sender isn't a known alert address, is rejected and stored
  nowhere.
- The same posting from two alerts shows once, listing both sources.
- A posting below Minimum pay shows under Filtered out with "Below minimum pay"; one with no pay shows under New marked
  Not listed.
- Every posting shows its hours overlap for both shifts, or Not listed. No posting is hidden for overlap.
- Changing a setting refilters existing postings without a new alert.
- A score of 80 or more sends exactly one email; scoring the same posting again sends none.
- Nothing in a posting's text can change a setting, send an email or reach a tool.

## Open questions

- Whether OnlineJobs sends job alert emails. If not, it needs another way in, decided before step 1 includes it.
- The owner's exact Day shift and Mid shift hours.
- Inbound email service: Postmark (mature inbound parsing) or Resend (one service for sending and receiving).
