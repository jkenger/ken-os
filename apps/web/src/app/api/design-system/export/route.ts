import { NextResponse } from "next/server";
import { designSystem } from "@/features/design-system/contract";
import { designSkillFiles } from "@/features/design-system/skill";
import { exportSkillZip } from "@/lib/skill-export";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const zip = await exportSkillZip("ken-os-design", designSkillFiles());
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="ken-os-design-${designSystem.version}.zip"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
