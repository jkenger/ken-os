import { NextResponse } from "next/server";
import { exportSkillZip } from "@/lib/skill-export";
import { getSkill } from "@/lib/skills";
import { getSession } from "@/lib/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Invalid skill ID." }, { status: 400 });
  const skill = await getSkill(session.userId, id);
  if (!skill) return NextResponse.json({ error: "Skill version not found." }, { status: 404 });

  const format = new URL(request.url).searchParams.get("format") ?? "zip";
  if (format !== "zip" && format !== "md") {
    return NextResponse.json({ error: "Unsupported export format." }, { status: 400 });
  }
  try {
    const filename = format === "zip" ? `${skill.slug}-v${skill.version}.zip` : "SKILL.md";
    const body = format === "zip"
      ? new Uint8Array(await exportSkillZip(skill.slug, skill.files))
      : skill.files["SKILL.md"];
    if (body === undefined) throw new Error("Missing SKILL.md.");
    return new NextResponse(body, {
      headers: {
        "Content-Type": format === "zip" ? "application/zip" : "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Could not export this skill." }, { status: 500 });
  }
}
