import { browserOwner, memoryResponse, readMemoryJson } from "@/features/project-memory/api";
import { MemoryInputError, parseDecisionRevision, parseReceiptRevision } from "@/features/project-memory/contract";
import { reviewMemoryItem, reviseMemoryItem } from "@/features/project-memory/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return memoryResponse(async () => {
    const userId = await browserOwner(request);
    const input = await readMemoryJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new MemoryInputError("Couldn't save the review. Reload the page");
    const { kind, id, action, changes } = input as Record<string, unknown>;
    if (kind !== "decision" && kind !== "receipt")
      throw new MemoryInputError("Couldn't save the review. Reload the page");
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
      throw new MemoryInputError("Couldn't save the review. Reload the page");
    if (action === "revise") {
      return kind === "decision"
        ? reviseMemoryItem(userId, "decision", id, parseDecisionRevision(changes))
        : reviseMemoryItem(userId, "receipt", id, parseReceiptRevision(changes));
    }
    if (action !== "approve" && action !== "reject")
      throw new MemoryInputError("Couldn't save the review. Reload the page");
    return reviewMemoryItem(userId, kind, id, action);
  });
}
