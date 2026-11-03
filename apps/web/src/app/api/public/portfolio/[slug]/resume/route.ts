import { publicResumeResponse } from "@/features/portfolio/public-resume";
import { renderResumePdf } from "@/features/profile/resume-pdf";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return publicResumeResponse(request, (await params).slug, renderResumePdf);
}
