import { NextResponse } from "next/server";
import { getGoogleAccessToken } from "@/lib/google";
import { getSession } from "@/lib/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  try {
    const accessToken = await getGoogleAccessToken(session.userId);
    return NextResponse.json(
      { accessToken },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Google connection failed.",
      },
      { status: 502 },
    );
  }
}
