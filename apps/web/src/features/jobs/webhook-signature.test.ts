import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyWebhookSignature } from "./webhook-signature";

const secret = "whsec_" + Buffer.from("test-secret-key-bytes").toString("base64");

function sign(id: string, timestamp: string, body: string, rawSecret: string) {
  const key = Buffer.from(rawSecret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${body}`;
  const signature = createHmac("sha256", key).update(signedContent).digest("base64");
  return `v1,${signature}`;
}

test("a correctly signed payload verifies", () => {
  const id = "msg_123";
  const timestamp = "1700000000";
  const body = '{"hello":"world"}';
  const signature = sign(id, timestamp, body, secret);
  assert.equal(verifyWebhookSignature({ id, timestamp, signature, body, secret }), true);
});

test("one matching signature among several space-separated ones verifies", () => {
  const id = "msg_123";
  const timestamp = "1700000000";
  const body = '{"hello":"world"}';
  const real = sign(id, timestamp, body, secret);
  assert.equal(verifyWebhookSignature({ id, timestamp, signature: `v1,bogus ${real}`, body, secret }), true);
});

test("a tampered body fails verification", () => {
  const id = "msg_123";
  const timestamp = "1700000000";
  const signature = sign(id, timestamp, '{"hello":"world"}', secret);
  assert.equal(verifyWebhookSignature({ id, timestamp, signature, body: '{"hello":"tampered"}', secret }), false);
});

test("a signature from the wrong secret fails verification", () => {
  const id = "msg_123";
  const timestamp = "1700000000";
  const body = '{"hello":"world"}';
  const wrongSecret = "whsec_" + Buffer.from("not-the-right-key").toString("base64");
  const signature = sign(id, timestamp, body, wrongSecret);
  assert.equal(verifyWebhookSignature({ id, timestamp, signature, body, secret }), false);
});

test("a missing signature header fails verification", () => {
  assert.equal(
    verifyWebhookSignature({ id: "msg_123", timestamp: "1700000000", signature: "", body: "{}", secret }),
    false,
  );
});
