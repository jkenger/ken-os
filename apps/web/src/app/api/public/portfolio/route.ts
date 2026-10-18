import { NextResponse } from "next/server";
import { liveSnapshot } from "@/features/portfolio/store";
import { ownerEmail, ownerEmailIsConfigured } from "@/lib/config";

export const runtime = "nodejs";

// The first Loots route anyone can call without signing in. It reads only the live published snapshot; no session,
// no cookies, nothing about the owner beyond what they published. Spec: docs/architecture/portfolio.md.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const snapshot = ownerEmailIsConfigured() ? await liveSnapshot(ownerEmail()) : null;
    if (!snapshot) return NextResponse.json({ error: "Not published" }, { status: 404, headers });
    return NextResponse.json(snapshot, { headers });
  } catch (error) {
    console.error("public portfolio failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}
