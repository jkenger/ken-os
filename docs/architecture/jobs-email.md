# Jobs: Email — technical design

Product spec: `docs/product/job-finder.md`, "Emails" and "Preferences" (Instant email from, Digest time), Release
step 3. Built — both slices below landed (`plans/jobs-email.md`, removed).

## Data model

`job_preferences` gains:

- `instant_email_threshold: integer not null default 80`
- `digest_time: text not null default '07:00'` — Philippine time, `HH:MM`, 24-hour.
- `last_digest_sent_at: timestamp | null`

`job_matches` gains:

- `instant_email_sent_at: timestamp | null`

None of these are touched by `filterReason()`/`refilterExisting()`, same reasoning as `viewed_at`/`saved_at` —
they track whether an email went out, not the posting's own state.

## Platform capability

`apps/web/src/platform/email/resend-client.ts` — the first thing in `platform/`, matching the Hard Architecture
convention (named runtime capability, not a `lib` dump). `sendEmail({ to, subject, html }): Promise<void>`. If
`RESEND_API_KEY` is unset, logs a warning once and returns without sending — same "missing secret, skip with a
warning" shape `dev-with-poll.ts`'s `readSecret()` already uses, so dev/test environments with no key configured
don't fail the Jobs pipeline over it.

## Trigger points

Both emails trigger from inside `/api/jobs/process`'s existing per-user loop (`processUserPostings`) — no new
scheduler entry, no new route. That route is already polled about once a minute by the outside scheduler (same
cadence as `check/freehire`), which is frequent enough for "instant" and granular enough to catch each owner's
own `digest_time` within about a minute. Adding a second cron entry would mean asking the owner to go configure
another job in cron-job.org for no real benefit.

- **Strong match**, right after a posting is scored: if `score >= preferences.instantEmailThreshold` and
  `instantEmailSentAt` is null, send the strong-match email, then set `instant_email_sent_at = now()`.
  Rescoring (a Profile version change) never resends — the spec's acceptance criteria is explicit ("scoring the
  same posting again sends none"), so this check is "ever sent", not "sent at this score".
- **Daily digest**, once per user per run: if the current Philippine-time `HH:MM` has reached
  `preferences.digestTime` and `lastDigestSentAt` is null or more than 20 hours ago (a tolerance band wider than
  the ~1 minute poll gap but narrower than a full day, so a slow or skipped run can't cause two sends in the same
  day), gather every posting with `first_seen_at` after `lastDigestSentAt` (or the last 24 hours, the first time),
  grouped by score, plus a count of postings filtered out in the same window grouped by reason. Send the digest,
  then set `last_digest_sent_at = now()`.

## Email content

Plain HTML strings built in code, no new template library — two emails isn't enough to justify one.

- **Strong match**: subject `"<score> · <title>, <company>"`. Body: score, pay, job type, work setup, shift,
  why it fits, a link to the posting's detail page in Loots (`${APP_URL}/jobs/<id>`).
- **Daily digest**: new postings since the last digest grouped by score band, plus how many were filtered out
  and why, same shape as the Filtered-out screen's own reason buckets.

## Settings UI

Two new fields in `filter-sidebar.tsx`'s existing preferences panel, same `save()` pattern every other field
there already uses (e.g. `agenciesHide`, `postedWithinDays`): Instant email threshold (number, 0-100) and Digest
time (a time-of-day input, `HH:MM`).

## Explicitly out of scope here

"Checker problems" email (spec: "freehire itself has no block state to report, but a sustained empty result
would still be worth a heads-up") — the spec never pins down what "sustained" means, and the OnlineJobs checker
it's mostly aimed at isn't built. Left for its own pass once that's decided.
