import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { hasValidOrigin } from "@/lib/origin";
import { messages } from "@/lib/messages";

/** Ends the Loots session. */
export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  await clearSession();
  return NextResponse.redirect(new URL("/sign-in?signed_out=1", request.url), { status: 303 });
}
