import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { getSession, type Session } from "@/lib/session";
import { LabInputError } from "./store";
import { messages } from "@/lib/messages";

/** Shared guard for Engineering Lab routes: owner session always, origin check on writes, plain errors out. */
export async function labRoute(request: Request, handler: (session: Session) => Promise<unknown>, options: { write: boolean; ai?: boolean }) {
  if (options.write && !hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  if (options.ai && !process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The AI roles are not configured yet." }, { status: 503 });
  try {
    return NextResponse.json(await handler(session), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof LabInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("engineering-lab route failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: options.ai ? "The AI step failed. Nothing was saved; try again." : "Something went wrong." }, { status: 502 });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new LabInputError("Expected a JSON object.");
  return body as Record<string, unknown>;
}

export function stringList(value: unknown, field: string, max = 50): string[] {
  if (!Array.isArray(value) || value.length > max || !value.every((item) => typeof item === "string" && item.length <= 500)) {
    throw new LabInputError(`${field} must be a list of up to ${max} short lines.`);
  }
  return value as string[];
}
