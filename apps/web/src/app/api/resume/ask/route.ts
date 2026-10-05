import { NextResponse } from "next/server";
import { askResumeAgent } from "@ken-os/agents";
import { GOOGLE_DOC_MIME } from "@ken-os/domain";
import { getGoogleDocText } from "@ken-os/drive";
import { getGoogleAccessToken } from "@/lib/google";
import { hasValidOrigin } from "@/lib/origin";
import { getSelectedResume } from "@/lib/resume";
import { getSession } from "@/lib/session";
import { getEnabledSkills } from "@/lib/skills";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const selection = await getSelectedResume(session.userId);
  if (!selection) return NextResponse.json({ error: "Select a resume first." }, { status: 404 });
  if (selection.mimeType !== GOOGLE_DOC_MIME) {
    return NextResponse.json({ error: "The assistant currently supports Google Docs resumes." }, { status: 415 });
  }
  const input = await request.json().catch(() => null) as { question?: unknown } | null;
  const question = input?.question;
  if (typeof question !== "string" || question.trim().length < 2 || question.length > 2000) {
    return NextResponse.json({ error: "Ask a question between 2 and 2000 characters." }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "The assistant is not configured yet." }, { status: 503 });
  try {
    const enabledSkills = await getEnabledSkills(session.userId);
    const result = await askResumeAgent(question.trim(), async () => {
      const accessToken = await getGoogleAccessToken(session.userId);
      return getGoogleDocText(selection.fileId, accessToken);
    }, enabledSkills);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "The assistant could not answer right now." }, { status: 502 });
  }
}
