import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { getSession } from "@/lib/session";
import { MemoryInputError } from "./contract";
import { messages } from "@/lib/messages";

export async function browserOwner(request: Request): Promise<string> {
  if (!hasValidOrigin(request)) throw new MemoryInputError(messages.invalidOrigin, 403);
  const session = await getSession();
  if (!session) throw new MemoryInputError(messages.signedOut, 401);
  return session.userId;
}

export async function readMemoryJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 32_768) throw new MemoryInputError("Memory draft is too large.", 413);
  const text = await request.text();
  if (text.length > 32_768) throw new MemoryInputError("Memory draft is too large.", 413);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MemoryInputError(messages.invalidJson);
  }
}

export async function memoryResponse<T>(operation: () => Promise<T>) {
  try {
    return NextResponse.json(await operation(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof MemoryInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Couldn't save. Try again" }, { status: 500 });
  }
}
