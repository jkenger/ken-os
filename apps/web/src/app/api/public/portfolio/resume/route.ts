import { NextResponse } from "next/server";
import { resumeFileName } from "@ken-os/domain";
import { publishedResumeDetails } from "@/features/portfolio/snapshot";
import { liveSnapshot } from "@/features/portfolio/store";
import { resumePdfHeaders } from "@/features/profile/api";
import { renderResumePdf } from "@/features/profile/resume-pdf";
import { ownerEmail, ownerEmailIsConfigured } from "@/lib/config";

export const runtime = "nodejs";

// The public resume: the live snapshot printed as a PDF, with the template and paper it was published with. Like
// /api/public/portfolio it reads no session and nothing but the live snapshot, so Unpublish makes it 404.
// `download=1` sends it as a file. Spec: docs/product/profile-resume.md, "Public link".
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  try {
    const snapshot = ownerEmailIsConfigured() ? await liveSnapshot(ownerEmail()) : null;
    if (!snapshot) return NextResponse.json({ error: "Not published" }, { status: 404, headers });
    const details = publishedResumeDetails(snapshot.profile);
    const { template, paper } = snapshot.resume ?? { template: "classic", paper: "letter" };
    const pdf = await renderResumePdf(details, template, paper);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(pdf), {
      headers: { ...resumePdfHeaders(resumeFileName(details), download), ...headers },
    });
  } catch (error) {
    console.error("public resume failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}
