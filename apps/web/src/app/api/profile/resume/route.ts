import { NextResponse } from "next/server";
import { isPaperSize, isResumeTemplate, resumeFileName } from "@ken-os/domain";
import { profileRoute, resumePdfHeaders } from "@/features/profile/api";
import { renderResumePdf } from "@/features/profile/resume-pdf";
import { getProfile, saveResumeSettings } from "@/features/profile/store";
import { messages } from "@/lib/messages";
import { getSession } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * The resume PDF from saved details. `template` and `paper` default to the remembered choice; `download=1` sends it
 * as a file instead of showing it in the preview.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const profile = await getProfile(session.userId);
  if (!profile.savedAt) return NextResponse.json({ error: "No details saved. Save them first" }, { status: 404 });

  const params = new URL(request.url).searchParams;
  const template = params.get("template");
  const paper = params.get("paper");
  try {
    const pdf = await renderResumePdf(
      profile.details,
      isResumeTemplate(template) ? template : profile.resume.template,
      isPaperSize(paper) ? paper : profile.resume.paper,
    );
    const download = params.get("download") === "1";
    return new NextResponse(new Uint8Array(pdf), {
      headers: resumePdfHeaders(resumeFileName(profile.details), download),
    });
  } catch (error) {
    console.error("resume pdf failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't make the PDF. Try again" }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  return profileRoute(request, (session, body) => saveResumeSettings(session.userId, body), { write: true });
}
