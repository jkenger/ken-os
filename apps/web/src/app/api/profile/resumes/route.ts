import { NextResponse } from "next/server";
import { ResumeFileError } from "@/features/profile/resume-files";
import { addResumeFile, listResumeFiles } from "@/features/profile/resume-files-store";
import { messages } from "@/lib/messages";
import { hasValidOrigin } from "@/lib/auth/origin";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  return NextResponse.json(await listResumeFiles(session.userId), { headers: noStore });
}

/** Stores one uploaded file (form field `file`). It reads nothing into the Profile; Autofill does that later. */
export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  try {
    const saved = await addResumeFile(session.userId, file.name, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json(saved, { status: 201, headers: noStore });
  } catch (error) {
    if (error instanceof ResumeFileError) return NextResponse.json({ error: error.message }, { status: 400 });
    console.error("resume upload failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't upload. Try again" }, { status: 502 });
  }
}
