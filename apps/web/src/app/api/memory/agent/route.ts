import { hasValidOrigin } from "@/lib/origin";
import { memoryResponse, readMemoryJson } from "@/features/project-memory/api";
import { MemoryInputError, parseDecisionDraft, parseReceiptDraft } from "@/features/project-memory/contract";
import {
  authorizeMemoryCredential,
  getMemoryOverview,
  submitDecision,
  submitReceipt,
} from "@/features/project-memory/store";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return memoryResponse(async () => {
    const userId = await authorizeMemoryCredential(request);
    const overview = await getMemoryOverview(userId);
    return {
      project: overview.project,
      policy: overview.policy,
      policyDigest: overview.policyDigest,
      approvedDecisions: overview.decisions.filter((item) => item.status === "approved"),
      proposedDecisions: overview.decisions
        .filter((item) => item.status === "proposed")
        .map((item) => ({ id: item.id, title: item.title, provenance: item.provenance })),
      recentApprovedReceipts: overview.receipts.filter((item) => item.status === "approved").slice(0, 10),
      openQuestions: overview.receipts
        .filter((item) => item.status === "approved")
        .flatMap((item) => item.remaining)
        .slice(0, 15),
    };
  });
}

export async function POST(request: Request) {
  return memoryResponse(async () => {
    if (!hasValidOrigin(request)) throw new MemoryInputError(messages.invalidOrigin, 403);
    const userId = await authorizeMemoryCredential(request);
    const input = await readMemoryJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new MemoryInputError("Invalid draft.");
    const { kind, draft } = input as Record<string, unknown>;
    if (kind === "decision") return submitDecision(userId, parseDecisionDraft(draft), "cli");
    if (kind === "receipt") return submitReceipt(userId, parseReceiptDraft(draft), "cli");
    throw new MemoryInputError("Draft kind must be decision or receipt.");
  });
}
