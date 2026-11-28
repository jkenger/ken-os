import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/auth/origin";
import { messages } from "@/lib/messages";
import { getSession, type Session } from "@/lib/auth/session";
import { LoonaInputError } from "./store";

/** Owner session and origin check, same guard as the Jobs/Portfolio/Profile routes. */
export async function loonaRoute(
  request: Request,
  handler: (session: Session, body: Record<string, unknown>) => Promise<unknown>,
) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  try {
    const body: unknown = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: messages.invalidJson }, { status: 400 });
    return NextResponse.json(await handler(session, body as Record<string, unknown>), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof LoonaInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("loona route failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't reach Loona. Try again" }, { status: 502 });
  }
}
