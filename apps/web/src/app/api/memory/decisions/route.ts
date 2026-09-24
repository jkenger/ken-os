import { parseDecisionDraft } from "@/features/project-memory/contract";
import { browserOwner, memoryResponse, readMemoryJson } from "@/features/project-memory/api";
import { submitDecision } from "@/features/project-memory/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return memoryResponse(async () => {
    const userId = await browserOwner(request);
    const draft = parseDecisionDraft(await readMemoryJson(request), true);
    return submitDecision(userId, draft, "browser");
  });
}
