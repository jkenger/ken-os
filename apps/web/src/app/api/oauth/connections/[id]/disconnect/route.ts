import { disconnect } from "@/features/connector/oauth-store";
import { messages } from "@/lib/messages";
import { hasValidOrigin } from "@/lib/origin";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

/** Disconnect on the Profile page: the connection's tokens stop working on the next call. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) return Response.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return Response.json({ error: messages.signedOut }, { status: 401 });
  return Response.json(await disconnect(session.userId, (await params).id), {
    headers: { "Cache-Control": "no-store" },
  });
}
