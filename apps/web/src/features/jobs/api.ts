import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { messages } from "@/lib/messages";
import { getSession, type Session } from "@/lib/session";

export class JobsInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Owner session and origin check, same guard as the Portfolio and Profile routes. */
export async function jobsRoute(
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
    if (error instanceof JobsInputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("jobs route failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't save. Try again" }, { status: 502 });
  }
}
