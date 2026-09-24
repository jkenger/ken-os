import assert from "node:assert/strict";
import { test } from "node:test";
import { MemoryInputError, parseDecisionDraft, parseReceiptDraft } from "./contract";

const decision = {
  schemaVersion: 1, projectId: "ken-os", idempotencyKey: "task-1:decision-1", taskKey: "task-1",
  title: "Keep Drive as source", issue: "Where is the canonical resume?", choice: "Google Drive",
  rationale: "The selected file stays current.", alternatives: [], provenance: "observed",
  evidence: [{ kind: "repo_file", locator: "docs/product/brief.md", relation: "supports" }],
};
const receipt = {
  schemaVersion: 1, projectId: "ken-os", policyVersion: 1, taskKey: "task-1",
  idempotencyKey: "task-1:receipt", outcome: "Built the memory pilot", verification: ["TypeScript passed"],
  remaining: ["Owner review"], evidence: [{ kind: "commit", locator: "https://github.com/jkenger/ken-os/commit/abc", relation: "supports" }],
};

test("accepts a bounded Ken OS decision and receipt", () => {
  assert.equal(parseDecisionDraft(decision).projectId, "ken-os");
  assert.equal(parseReceiptDraft(receipt).policyVersion, 1);
});

test("rejects another project and mismatched policy", () => {
  assert.throws(() => parseDecisionDraft({ ...decision, projectId: "client-repo" }), (error) => error instanceof MemoryInputError && error.status === 403);
  assert.throws(() => parseReceiptDraft({ ...receipt, policyVersion: 2 }), (error) => error instanceof MemoryInputError && error.status === 409);
});

test("does not allow an agent to claim owner intent without conversation evidence", () => {
  assert.throws(() => parseDecisionDraft({ ...decision, provenance: "owner_stated" }), /conversation reference/);
  assert.equal(parseDecisionDraft({ ...decision, provenance: "owner_stated" }, true).provenance, "owner_stated");
});

test("rejects unsafe evidence references and credential-shaped content", () => {
  assert.throws(() => parseDecisionDraft({ ...decision, evidence: [{ kind: "repo_file", locator: "../secret.txt", relation: "supports" }] }), /relative path/);
  assert.throws(() => parseReceiptDraft({ ...receipt, evidence: [{ kind: "commit", locator: "http://github.com/example", relation: "supports" }] }), /HTTPS URL/);
  assert.throws(() => parseReceiptDraft({ ...receipt, outcome: `Captured ${"sk-" + "A".repeat(24)}` }), /credential/);
});

test("rejects excessive payload fields", () => {
  assert.throws(() => parseReceiptDraft({ ...receipt, remaining: Array(11).fill("later") }), /at most 10/);
  assert.throws(() => parseDecisionDraft({ ...decision, title: "x".repeat(161) }), /Title/);
});
