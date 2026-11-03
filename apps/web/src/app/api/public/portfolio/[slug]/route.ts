import { NextResponse } from "next/server";
import { liveSnapshot } from "@/features/portfolio/store";

export const runtime = "nodejs";

// The first Loots route anyone can call without signing in. It reads only the live published snapshot at this
// handle; no session, no cookies, nothing about the account beyond what it published. Spec:
// docs/architecture/portfolio.md.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const snapshot = await liveSnapshot((await params).slug);
    if (!snapshot) return NextResponse.json({ error: "Not published" }, { status: 404, headers });
    return NextResponse.json(snapshot, { headers });
  } catch (error) {
    console.error("public portfolio failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}
