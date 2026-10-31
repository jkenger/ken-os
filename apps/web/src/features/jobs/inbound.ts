import { knownAlertSource } from "./known-senders";
import { parseLinkedInAlert } from "./parsers/linkedin";
import type { RawPosting } from "./raw-posting";
import { verifyWebhookSignature } from "./webhook-signature";

type FetchedEmail = { from: string; html: string | null; text: string | null };

/**
 * Verifies the webhook, checks the original sender, stores the raw email, parses it and saves the postings
 * (docs/product/job-finder.md, "Receive" and "Split"). Takes the Resend fetch and the store as parameters so this
 * stays testable without a real webhook request or database.
 */
export async function handleInboundEmail(params: {
  svixId: string;
  svixTimestamp: string;
  svixSignature: string;
  rawBody: string;
  webhookSecret: string;
  fetchEmail: (body: unknown) => Promise<FetchedEmail>;
  saveInboundEmail: (params: {
    fromAddress: string;
    source: "linkedin" | "indeed" | null;
    rawHtml?: string;
    rawText?: string;
  }) => Promise<string>;
  savePostings: (postings: RawPosting[]) => Promise<void>;
}): Promise<{ stored: boolean; reason?: string }> {
  const verified = verifyWebhookSignature({
    id: params.svixId,
    timestamp: params.svixTimestamp,
    signature: params.svixSignature,
    body: params.rawBody,
    secret: params.webhookSecret,
  });
  if (!verified) return { stored: false, reason: "bad signature" };

  const body = JSON.parse(params.rawBody) as { type: string; data: { email_id: string; from: string } };
  if (body.type !== "email.received") return { stored: false, reason: "not an email.received event" };

  const source = knownAlertSource(body.data.from);
  if (!source) return { stored: false, reason: "unknown sender" };

  const email = await params.fetchEmail(body.data.email_id);

  await params.saveInboundEmail({
    fromAddress: email.from,
    source,
    rawHtml: email.html ?? undefined,
    rawText: email.text ?? undefined,
  });

  if (!email.html) return { stored: true };

  const postings = source === "linkedin" ? parseLinkedInAlert(email.html) : [];
  if (postings.length) await params.savePostings(postings);

  return { stored: true };
}
