import { Resend } from "resend";

// The first thing in platform/ (Hard Architecture: a named runtime capability, not a `lib` dump). Wraps Resend so
// the Jobs pipeline (docs/architecture/jobs-email.md) can send without knowing the SDK directly, and keeps
// running with no RESEND_API_KEY configured -- logging the gap once instead of failing every pipeline run, the
// same "missing secret, skip with a warning" shape `dev-with-poll.ts`'s `readSecret()` already uses.

let warnedMissingKey = false;

/** shortcut: the sender address has no verified domain configured yet, so it falls back to Resend's own
 *  sandbox address (`onboarding@resend.dev`), which sends without domain verification; set RESEND_FROM_EMAIL
 *  once Loots has a verified sending domain. */
const DEFAULT_FROM = "Loots <onboarding@resend.dev>";

export async function sendEmail(params: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (!warnedMissingKey) {
      console.warn("platform/email/resend-client: RESEND_API_KEY not set -- emails are not being sent");
      warnedMissingKey = true;
    }
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
