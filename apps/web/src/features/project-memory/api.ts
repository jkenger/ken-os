import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { getSession } from "@/lib/session";
import { MemoryInputError } from "./contract";

export async function browserOwner(request: Request): Promise<string> {
  if (!hasValidOrigin(request)) throw new MemoryInputError("Invalid origin.", 403);
  const session = await getSession();
  if (!session) throw new MemoryInputError("Sign in required.", 401);
  return session.userId;
}

export async function readMemoryJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 32_768) throw new MemoryInputError("Memory draft is too large.", 413);
  const text = await request.text();
  if (text.length > 32_768) throw new MemoryInputError("Memory draft is too large.", 413);
  try { return JSON.parse(text) as unknown; }
  catch { throw new MemoryInputError("Invalid JSON."); }
}

export async function memoryResponse<T>(operation: () => Promise<T>) {
  try {
    return NextResponse.json(await operation(), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof MemoryInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not complete the memory request." }, { status: 500 });
  }
}
