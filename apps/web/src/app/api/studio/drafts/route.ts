import { NextResponse } from "next/server";
import { parseDraft } from "@/features/design-studio/drafts";
import { discardAllDrafts, discardDraft, saveDraft } from "@/features/design-studio/drafts-store";
import { studioManifest } from "@/features/design-studio/manifest.generated";
import { messages } from "@/lib/messages";
import { hasValidOrigin } from "@/lib/auth/origin";
import { getSession, type Session } from "@/lib/auth/session";

export const runtime = "nodejs";

// The Design Studio's drafts: PUT saves one, DELETE discards one or, with { all: true }, every draft. Each answers
// with the owner's drafts as they now stand. Same guard as the Portfolio routes: owner session and origin check.

async function guarded(request: Request, handler: (session: Session, body: unknown) => Promise<unknown>) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid draft" }, { status: 400 });
  }
  try {
    const result = await handler(session, body);
    if (result instanceof NextResponse) return result;
    return NextResponse.json({ drafts: result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("studio drafts route failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't save" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  return guarded(request, (session, body) => {
    const parsed = parseDraft(body, studioManifest);
    if ("error" in parsed) return Promise.resolve(NextResponse.json({ error: parsed.error }, { status: 400 }));
    return saveDraft(session.userId, parsed.draft);
  });
}

export async function DELETE(request: Request) {
  return guarded(request, (session, body) => {
    if (body && typeof body === "object" && (body as { all?: unknown }).all === true)
      return discardAllDrafts(session.userId);
    const { kind, target } = (body ?? {}) as { kind?: unknown; target?: unknown };
    if ((kind !== "token" && kind !== "component") || typeof target !== "string")
      return Promise.resolve(NextResponse.json({ error: "Invalid draft" }, { status: 400 }));
    return discardDraft(session.userId, { kind, target });
  });
}
