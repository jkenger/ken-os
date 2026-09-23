import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";
import { hasValidOrigin } from "@/lib/origin";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  await clearSession();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
