import type { PostingView } from "./store";

// The daily digest email (docs/architecture/jobs-email.md, "Trigger points" and "Email content"): once per day,
// once the current Philippine time has reached the owner's own `digestTime`, rounding up every new posting
// since the last digest plus why postings got filtered out in the same window. `isDigestDue` and
// `philippineTimeOfDay` are kept pure and tested directly, same reasoning as `needsStrongMatchEmail`.

const PH_OFFSET_MINUTES = 8 * 60; // UTC+8, no daylight saving -- shift.ts uses the same constant for postings.
const MINUTES_PER_DAY = 24 * 60;
const TOLERANCE_HOURS = 20; // docs/architecture/jobs-email.md: wider than the ~1 minute poll gap, narrower than a day.

/** The current Philippine time of day as `HH:MM`, from a UTC `Date` -- `digestTime` is stored and compared in
 *  the same zone, so the owner's "7:00 AM" always means Philippine 7 AM regardless of where the server runs. */
export function philippineTimeOfDay(now: Date): string {
  const minutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + PH_OFFSET_MINUTES) % MINUTES_PER_DAY;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Due once the current Philippine time has reached the owner's chosen `digestTime` and it's been long enough
 *  since the last send -- the tolerance band is wider than the scheduler's ~1 minute poll gap but narrower than
 *  a full day, so a slow or skipped run can't send twice in the same day (docs/architecture/jobs-email.md,
 *  "Trigger points"). HH:MM strings compare correctly as plain strings since both sides are always zero-padded. */
export function isDigestDue(
  nowPhilippineTime: string,
  digestTime: string,
  lastDigestSentAt: Date | null,
  now: Date,
): boolean {
  if (nowPhilippineTime < digestTime) return false;
  if (lastDigestSentAt === null) return true;
  const hoursSinceLast = (now.getTime() - lastDigestSentAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceLast > TOLERANCE_HOURS;
}

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** A posting's own title and company are untrusted text, same as the strong-match email -- escaped before going
 *  into the digest's HTML body (docs/product/job-finder.md: "Nothing in a posting's text can change a setting"). */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

type ScoreBand = "80 and up" | "60 to 79" | "Below 60" | "Not yet scored";
const SCORE_BANDS: ScoreBand[] = ["80 and up", "60 to 79", "Below 60", "Not yet scored"];

/** shortcut: three fixed score bands, not an owner setting -- fine for a daily roundup; revisit if the owner
 *  ever wants different cutoffs than this plain 80/60 split. */
function scoreBand(score: number | null): ScoreBand {
  if (score === null) return "Not yet scored";
  if (score >= 80) return "80 and up";
  if (score >= 60) return "60 to 79";
  return "Below 60";
}

export type DigestPosting = Pick<PostingView, "id" | "title" | "company" | "score">;
export type DigestFilterReasonCount = { reason: string; count: number };

/** Subject and body for one daily digest (docs/product/job-finder.md, "Emails": "new postings since the last
 *  digest, grouped by score, plus how many were filtered out and why"). `appUrl` is `process.env.APP_URL`,
 *  passed in rather than read here so this stays a pure function. */
export function digestEmail(
  postings: DigestPosting[],
  filteredOut: DigestFilterReasonCount[],
  appUrl: string,
): { subject: string; html: string } {
  const subject =
    postings.length === 0
      ? "Job digest: no new postings today"
      : `Job digest: ${postings.length} new posting${postings.length === 1 ? "" : "s"}`;

  const groups = SCORE_BANDS.map((band) => ({
    band,
    postings: postings.filter((posting) => scoreBand(posting.score) === band),
  })).filter((group) => group.postings.length > 0);

  const postingsHtml = groups
    .map(
      (group) =>
        `<p><strong>${group.band}</strong></p><ul>${group.postings
          .map(
            (posting) =>
              `<li><a href="${appUrl}/jobs/${posting.id}">${escapeHtml(posting.title)}, ${escapeHtml(posting.company)}</a>${
                posting.score !== null ? ` (${posting.score})` : ""
              }</li>`,
          )
          .join("")}</ul>`,
    )
    .join("");

  const filteredOutHtml = filteredOut.length
    ? `<p>Filtered out:</p><ul>${filteredOut.map((item) => `<li>${escapeHtml(item.reason)}: ${item.count}</li>`).join("")}</ul>`
    : "";

  const html = `<div>
  ${postingsHtml || "<p>No new postings today.</p>"}
  ${filteredOutHtml}
</div>`;

  return { subject, html };
}

/** Once per user per `/api/jobs/process` run (docs/architecture/jobs-email.md, "Trigger points"): checks whether
 *  it's due, gathers the window's new postings and filtered-out counts, sends, then stamps
 *  `last_digest_sent_at`. DI shape matches `sendStrongMatchEmailIfDue`, testable without a real database, email
 *  provider or clock. */
export async function sendDigestEmailIfDue(
  userId: string,
  preferences: { digestTime: string; lastDigestSentAt: Date | null },
  now: Date,
  deps: {
    getUserEmail: (userId: string) => Promise<string | null>;
    getDigestPostings: (userId: string, since: Date) => Promise<DigestPosting[]>;
    getFilteredOutCounts: (userId: string, since: Date) => Promise<DigestFilterReasonCount[]>;
    sendEmail: (params: { to: string; subject: string; html: string }) => Promise<void>;
    markSent: (userId: string) => Promise<void>;
    appUrl: string;
  },
): Promise<void> {
  if (!isDigestDue(philippineTimeOfDay(now), preferences.digestTime, preferences.lastDigestSentAt, now)) return;

  const since = preferences.lastDigestSentAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const [postings, filteredOut] = await Promise.all([
    deps.getDigestPostings(userId, since),
    deps.getFilteredOutCounts(userId, since),
  ]);

  const to = await deps.getUserEmail(userId);
  if (!to) return;

  const { subject, html } = digestEmail(postings, filteredOut, deps.appUrl);
  await deps.sendEmail({ to, subject, html });
  await deps.markSent(userId);
}
