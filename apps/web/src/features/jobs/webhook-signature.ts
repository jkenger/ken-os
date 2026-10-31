import { createHmac, timingSafeEqual } from "node:crypto";

// Resend signs inbound webhooks the way Svix does: HMAC-SHA256 over "{id}.{timestamp}.{body}", with the webhook
// secret's base64 payload (after the "whsec_" prefix) as the key. The signature header holds one or more
// space-separated "v1,<base64>" values; any one matching is enough.

export function verifyWebhookSignature({
  id,
  timestamp,
  signature,
  body,
  secret,
}: {
  id: string;
  timestamp: string;
  /** The raw "webhook-signature" (or "svix-signature") header value. */
  signature: string;
  body: string;
  secret: string;
}): boolean {
  if (!signature) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signature
    .split(" ")
    .map((part) => part.split(",")[1])
    .filter((candidate): candidate is string => Boolean(candidate))
    .some((candidate) => {
      let given: Buffer;
      try {
        given = Buffer.from(candidate, "base64");
      } catch {
        return false;
      }
      return given.length === expected.length && timingSafeEqual(given, expected);
    });
}
