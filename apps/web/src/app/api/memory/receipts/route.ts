import { parseReceiptDraft } from "@/features/project-memory/contract";
import { browserOwner, memoryResponse, readMemoryJson } from "@/features/project-memory/api";
import { submitReceipt } from "@/features/project-memory/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return memoryResponse(async () => {
    const userId = await browserOwner(request);
    const draft = parseReceiptDraft(await readMemoryJson(request));
    return submitReceipt(userId, draft, "browser");
  });
}
