import { NextResponse } from "next/server";
import { hasValidOrigin } from "@/lib/origin";
import { parseSkillBundle, SkillBundleError } from "@/lib/skill-bundle";
import { saveSkill } from "@/lib/skills";
import { getSession } from "@/lib/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 600 * 1024) return NextResponse.json({ error: "Upload failed. Max size is 512 KB" }, { status: 413 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("bundle");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a SKILL.md or ZIP file" }, { status: 400 });
  try {
    const bundle = await parseSkillBundle(file.name, Buffer.from(await file.arrayBuffer()));
    const id = await saveSkill(session.userId, bundle);
    return NextResponse.json({ id, name: bundle.name });
  } catch (error) {
    if (error instanceof SkillBundleError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Couldn't add this skill. Try again" }, { status: 500 });
  }
}
