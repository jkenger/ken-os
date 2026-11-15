# Plan: Jobs Email

**Branch**: one per slice, `feat/jobs-email-<slice>`
**Status**: Active

## Goal

Strong match emails and the daily digest, release step 3 of `docs/product/job-finder.md`. Technical design:
`docs/architecture/jobs-email.md`.

## Acceptance Criteria

- [ ] A score at or above the owner's instant-email threshold sends exactly one email; scoring the same posting
      again, even after a rescore, sends none.
- [ ] Once a day, at the owner's chosen time (Philippine time), a digest email lists every new posting since the
      last digest, grouped by score, plus how many were filtered out and why.
- [ ] Both thresholds (instant email score, digest time) are owner settings with sensible defaults (80, 7:00 AM).
- [ ] With no `RESEND_API_KEY` configured, the Jobs pipeline keeps running — nothing throws, a warning logs once.

## Slices

### Slice 1: Strong match email

**Value**: The owner gets notified the moment a posting scores well, without checking the app.
**Path**: `job_preferences.instant_email_threshold` (new column) + Settings UI field (`filter-sidebar.tsx`) →
`job_matches.instant_email_sent_at` (new column) → `platform/email/resend-client.ts` (new) → a strong-match email
builder → wired into `processUserPostings`'s scoring step in `pipeline.ts`, called from `/api/jobs/process`.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk.
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria**: A posting scored at or above the threshold sends one email with the right subject/body;
scoring it again (simulating a rescore) sends none; a posting below the threshold sends none.
**RED**: `verify-jobs.ts` — a scored posting at/above threshold gets `instant_email_sent_at` set and the email
"sent" (a fake/mock `sendEmail` the test can assert was called once); scoring again doesn't call it a second
time; below-threshold never calls it.
**GREEN**: Migration, the Resend client, the email builder, the trigger in `pipeline.ts`, the Settings field.
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness for this slice's scope.
**PR-ready when**: Criteria above met, `pnpm check`/`test`/`build` pass from `apps/web`.
**Slice complete when**: Its PR lands.

### Slice 2: Daily digest email

**Value**: The owner gets one daily roundup even for postings that never crossed the instant-email bar.
**Path**: `job_preferences.digest_time` + `last_digest_sent_at` (new columns) + Settings UI field →
a digest query (new postings since last digest grouped by score, filtered-out count by reason in the same
window) → a digest email builder → wired into the same per-user loop in `pipeline.ts`/`/api/jobs/process`,
checked once per run against the current Philippine time.
**Class**: Behavior change.
**Delivery**: Independent PR against trunk (depends on Slice 1 for the Resend client, not for anything else).
**Required implementation skills**: `tdd`, `testing`.
**Acceptance criteria**: Once the owner's chosen time has passed and it's been long enough since the last
digest, exactly one digest email sends, listing the right postings and filtered-out counts; running the process
route again soon after doesn't send a second one that day.
**RED**: `verify-jobs.ts` — the digest query returns the right postings/counts for a given window; the "is a
digest due" decision is a pure function of `(nowPhilippineTime, digestTime, lastDigestSentAt)` tested directly,
same reasoning as Slice 2 of the Job Board plan's `shouldShowApplyDialog`.
**GREEN**: Migrations, the digest query, the digest email builder, the due-check, the trigger, the Settings field.
**REFACTOR**: N/A.
**PRE-PR MUTATION**: Run once at PR readiness.
**PR-ready when**: Criteria met, full gate passes.
**Slice complete when**: Its PR lands.

## Pre-PR Quality Gate

Before each PR, from `apps/web`: `pnpm check`, `pnpm test`, `pnpm build`, plus `pnpm --filter @ken-os/web
test:db:jobs`. No mutation-testing harness is configured in this repo today — skip that step, rely on the
behavior tests named per slice above.

## Out of scope

"Checker problems" email — see `docs/architecture/jobs-email.md`'s closing note.

---

_Delete this file and remove `plans/` if it's left empty, once every slice's PR has landed._
