import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { parseDecisionDraft, parseReceiptDraft } from "../src/features/project-memory/contract";
import { getMemoryOverview, reviewMemoryItem, reviseMemoryItem, submitDecision, submitReceipt } from "../src/features/project-memory/store";
import { ownerEmail } from "../src/lib/config";
import { closeDb, db } from "../src/lib/db";
import { users } from "../src/lib/schema";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const [owner] = await db().select({ id: users.id }).from(users).where(eq(users.email, ownerEmail())).limit(1);
  if (!owner) throw new Error("Sign in locally once before running the memory integration check.");
  const taskKey = `memory-local-check-${randomUUID()}`;
  const decision = parseDecisionDraft({
    schemaVersion: 1, projectId: "ken-os", taskKey, idempotencyKey: `${taskKey}:decision`,
    title: "Local verification draft", issue: "Does the proposed-review path work?",
    choice: "Reject this disposable test draft after checking its revision.", rationale: "Integration test only.",
    alternatives: [], provenance: "observed", evidence: [{ kind: "test", locator: "apps/web/scripts/verify-memory.ts", relation: "supports" }],
  });
  const first = await submitDecision(owner.id, decision, "cli");
  const duplicate = await submitDecision(owner.id, decision, "cli");
  assert.equal(first.id, duplicate.id);
  assert.equal(duplicate.duplicate, true);
  const correction = await reviseMemoryItem(owner.id, "decision", first.id, {
    title: decision.title, issue: decision.issue, choice: decision.choice,
    rationale: "Corrected during local integration check.", alternatives: [],
  });
  assert.equal(correction.version, 2);
  await reviewMemoryItem(owner.id, "decision", first.id, "reject");

  const receipt = parseReceiptDraft({
    schemaVersion: 1, projectId: "ken-os", policyVersion: 1, taskKey,
    idempotencyKey: `${taskKey}:receipt`, outcome: "Local memory integration check",
    verification: ["Decision idempotency and revision passed"], remaining: [],
    evidence: [{ kind: "test", locator: "apps/web/scripts/verify-memory.ts", relation: "supports" }],
  });
  const firstReceipt = await submitReceipt(owner.id, receipt, "cli");
  assert.equal((await submitReceipt(owner.id, receipt, "cli")).duplicate, true);
  assert.equal((await reviseMemoryItem(owner.id, "receipt", firstReceipt.id, {
    outcome: receipt.outcome, verification: ["Decision and receipt checks passed"], remaining: [],
  })).version, 2);
  await reviewMemoryItem(owner.id, "receipt", firstReceipt.id, "reject");
  const overview = await getMemoryOverview(owner.id);
  assert.equal(overview.decisions.find((item) => item.id === first.id)?.status, "rejected");
  assert.equal(overview.receipts.find((item) => item.id === firstReceipt.id)?.status, "rejected");
  console.log("Project Memory local integration check passed; disposable drafts were rejected.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Memory integration check failed.");
  process.exitCode = 1;
}).finally(async () => closeDb());
