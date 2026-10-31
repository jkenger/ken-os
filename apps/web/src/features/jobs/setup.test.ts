import assert from "node:assert/strict";
import { test } from "node:test";
import { forwardingAddressStatus } from "./setup";

test("a configured address is trimmed and reported ready", () => {
  assert.deepEqual(forwardingAddressStatus("  jobs-jk@loots.app  "), {
    configured: true,
    address: "jobs-jk@loots.app",
  });
});

test("a missing address is reported not configured", () => {
  assert.deepEqual(forwardingAddressStatus(undefined), { configured: false });
});

test("a whitespace-only address is reported not configured", () => {
  assert.deepEqual(forwardingAddressStatus("   "), { configured: false });
});
