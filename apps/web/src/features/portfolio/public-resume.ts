import { NextResponse } from "next/server";
import { resumeFileName } from "@ken-os/domain";
import { resumePdfHeaders } from "@/features/profile/api";
import type { renderResumePdf } from "@/features/profile/resume-pdf";
import { ownerEmail, ownerEmailIsConfigured } from "@/lib/config";
import { publishedResumeDetails } from "./snapshot";
import { liveSnapshot } from "./store";

// The public resume: the live snapshot printed as a PDF, with the template and paper it was published with. Like
// /api/public/portfolio it reads no session and nothing but the live snapshot, so Unpublish makes it 404.
// `download=1` sends it as a file. The renderer is passed in so the database check can run this without @react-pdf.
// Spec: docs/product/profile-resume.md, "Step 4 design".
export async function publicResumeResponse(request: Request, render: typeof renderResumePdf) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  try {
    const snapshot = ownerEmailIsConfigured() ? await liveSnapshot(ownerEmail()) : null;
    if (!snapshot) return NextResponse.json({ error: "Not published" }, { status: 404, headers });
    const details = publishedResumeDetails(snapshot.profile);
    const { template, paper } = snapshot.resume ?? { template: "classic", paper: "letter" };
    const pdf = await render(details, template, paper);
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(pdf), {
      headers: { ...resumePdfHeaders(resumeFileName(details), download), ...headers },
    });
  } catch (error) {
    console.error("public resume failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503, headers });
  }
}
