import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { getSession, type Session } from "@/lib/session";
import { messages } from "@/lib/messages";
import { ProfileInputError } from "./store";

/** Owner session always, origin check on writes, plain errors out. Same guard as the Engineering and Terms routes. */
export async function profileRoute(
  request: Request,
  handler: (session: Session, body: Record<string, unknown>) => Promise<unknown>,
  /** `ai` names the AI step (Import, Rewrite) for its errors, and needs OPENAI_API_KEY. */
  options: { write: boolean; ai?: "Import" | "Rewrite" },
) {
  if (options.write && !hasValidOrigin(request))
    return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  if (options.ai && !process.env.OPENAI_API_KEY)
    return NextResponse.json({ error: `${options.ai} isn't set up` }, { status: 503 });
  try {
    const body = options.write ? await request.json().catch(() => null) : {};
    if (!body || typeof body !== "object" || Array.isArray(body))
      return NextResponse.json({ error: messages.invalidJson }, { status: 400 });
    return NextResponse.json(await handler(session, body as Record<string, unknown>), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof ProfileInputError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("profile route failed", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: options.ai ? `${options.ai} failed. Nothing saved. Try again` : "Couldn't save. Try again" },
      { status: 502 },
    );
  }
}

/** Headers for a resume PDF: shown in the page, or sent as a file named like "Ken Gervacio Resume.pdf". */
export function resumePdfHeaders(name: string, download: boolean): Record<string, string> {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name.replace(/[^\x20-\x7e]/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}
