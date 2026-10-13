import { NextResponse } from "next/server";
import { DriveAccessError, getGoogleAccessToken } from "@/lib/google";
import { getSession } from "@/lib/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  try {
    const accessToken = await getGoogleAccessToken(session.userId);
    return NextResponse.json({ accessToken }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Couldn't reach Google Drive. Try again",
        // Lets the Profile page switch to Connect or Reconnect Google Drive.
        drive: error instanceof DriveAccessError ? error.access : undefined,
      },
      { status: 502 },
    );
  }
}
