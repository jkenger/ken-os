import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { getSession, type Session } from "@/lib/session";
import { TermInputError } from "./store";
import { messages } from "@/lib/messages";

/** Owner session always, origin check on writes, plain errors out. Same guard as the Engineering Lab routes. */
export async function termsRoute(
  request: Request,
  handler: (session: Session, body: Record<string, unknown>) => Promise<unknown>,
  options: { write: boolean },
) {
  if (options.write && !hasValidOrigin(request))
    return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  try {
    const body = request.method === "POST" ? await request.json().catch(() => null) : {};
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new TermInputError("Expected a JSON object.");
    return NextResponse.json(await handler(session, body as Record<string, unknown>), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof TermInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("terms route failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Lookup failed. Try again" }, { status: 502 });
  }
}

export function text(value: unknown, field: string, max: number, optional = false): string {
  if (optional && (value === undefined || value === null || value === "")) return "";
  if (typeof value !== "string" || value.length > max)
    throw new TermInputError(`${field} must be text up to ${max} characters.`);
  return value;
}
