import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { getSession } from "@/lib/session";
import { setSkillEnabled } from "@/lib/skills";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid skill ID." }, { status: 400 });
  const input = await request.json().catch(() => null) as { enabled?: unknown } | null;
  if (typeof input?.enabled !== "boolean") return NextResponse.json({ error: "Expected enabled: true or false." }, { status: 400 });
  try {
    await setSkillEnabled(session.userId, id, input.enabled);
    return NextResponse.json({ enabled: input.enabled });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update skill." }, { status: 400 });
  }
}
