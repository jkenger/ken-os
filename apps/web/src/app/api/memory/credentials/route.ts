import { browserOwner, memoryResponse, readMemoryJson } from "@/features/project-memory/api";
import { MemoryInputError } from "@/features/project-memory/contract";
import { issueMemoryCredential, revokeMemoryCredential } from "@/features/project-memory/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return memoryResponse(async () => {
    const userId = await browserOwner(request);
    return issueMemoryCredential(userId);
  });
}

export async function DELETE(request: Request) {
  return memoryResponse(async () => {
    const userId = await browserOwner(request);
    const input = await readMemoryJson(request);
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new MemoryInputError("Couldn't revoke. Reload the page");
    const { id } = input as Record<string, unknown>;
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id))
      throw new MemoryInputError("Couldn't revoke. Reload the page");
    await revokeMemoryCredential(userId, id);
    return { revoked: true };
  });
}
