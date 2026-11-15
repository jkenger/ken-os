import type { PayPeriod } from "./preferences-store";

// The strong-match email (docs/architecture/jobs-email.md, "Email content" and "Trigger points"): sent once per
// posting, the moment its score crosses the owner's instant-email threshold. `needsStrongMatchEmail` is the
// trigger's own decision, kept pure and tested on its own -- it's "ever sent", not "sent at this score", so a
// later rescore (a Profile version change re-running scoring) never resends even if the score moves
// (docs/product/job-finder.md: "scoring the same posting again sends none").
export function needsStrongMatchEmail(score: number | null, threshold: number, alreadySent: boolean): boolean {
  return score !== null && score >= threshold && !alreadySent;
}

export type StrongMatchPosting = {
  id: string;
  title: string;
  company: string;
  score: number;
  payAmount: number | null;
  payCurrency: string | null;
  payPeriod: PayPeriod | null;
  jobType: string | null;
  workSetup: string | null;
  shift: string | null;
  whyFits: { reason: string; citation: string }[];
};

const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
};

const WORK_SETUP_LABELS: Record<string, string> = { remote: "Remote", hybrid: "Hybrid", on_site: "On site" };

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** A posting's own title, company and score reasons are untrusted text, same as everywhere else in Jobs
 *  (docs/product/job-finder.md: "Nothing in a posting's text can change a setting") -- escaped before going into
 *  the email's HTML body. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}

function payLine(amount: number | null, currency: string | null, period: PayPeriod | null): string {
  if (amount == null || !currency || !period) return "Not listed";
  return `${currency} ${Math.round(amount).toLocaleString()} a ${period}`;
}

/** Subject and body for one strong match (docs/product/job-finder.md, "Emails": `"92 · Senior Frontend
 *  Engineer, Acme"`). `appUrl` is `process.env.APP_URL`, passed in rather than read here so this stays a pure
 *  function. */
export function strongMatchEmail(posting: StrongMatchPosting, appUrl: string): { subject: string; html: string } {
  const subject = `${posting.score} · ${posting.title}, ${posting.company}`;
  const link = `${appUrl}/jobs/${posting.id}`;
  const whyFits = posting.whyFits.map((item) => `<li>${escapeHtml(item.reason)}</li>`).join("");
  const html = `<div>
  <p><strong>${posting.score}</strong> match &middot; ${escapeHtml(posting.title)}, ${escapeHtml(posting.company)}</p>
  <p>
    Pay: ${escapeHtml(payLine(posting.payAmount, posting.payCurrency, posting.payPeriod))}<br>
    Job type: ${escapeHtml(posting.jobType ? (JOB_TYPE_LABELS[posting.jobType] ?? posting.jobType) : "Not listed")}<br>
    Work setup: ${escapeHtml(posting.workSetup ? (WORK_SETUP_LABELS[posting.workSetup] ?? posting.workSetup) : "Not listed")}<br>
    Shift: ${escapeHtml(posting.shift ?? "Not listed")}
  </p>
  ${whyFits ? `<p>Why it fits:</p><ul>${whyFits}</ul>` : ""}
  <p><a href="${link}">Open posting</a></p>
</div>`;
  return { subject, html };
}

export type StrongMatchCandidate = Omit<StrongMatchPosting, "score"> & {
  score: number | null;
  instantEmailSentAt: Date | null;
};

/** Right after a posting is scored (docs/architecture/jobs-email.md, "Trigger points"): re-reads the posting's
 *  current score and send state, decides with `needsStrongMatchEmail`, and sends and stamps it when due.
 *  Dependencies are injected, same DI shape as `process.ts`, so this is testable without a real database, email
 *  provider or HTTP call. */
export async function sendStrongMatchEmailIfDue(
  userId: string,
  postingId: string,
  threshold: number,
  deps: {
    getPosting: (userId: string, postingId: string) => Promise<StrongMatchCandidate | null>;
    getUserEmail: (userId: string) => Promise<string | null>;
    sendEmail: (params: { to: string; subject: string; html: string }) => Promise<void>;
    markSent: (userId: string, postingId: string) => Promise<void>;
    appUrl: string;
  },
): Promise<void> {
  const posting = await deps.getPosting(userId, postingId);
  if (!posting) return;
  const { score } = posting;
  if (!needsStrongMatchEmail(score, threshold, posting.instantEmailSentAt !== null) || score === null) return;

  const to = await deps.getUserEmail(userId);
  if (!to) return;

  const { subject, html } = strongMatchEmail({ ...posting, score }, deps.appUrl);
  await deps.sendEmail({ to, subject, html });
  await deps.markSent(userId, postingId);
}
