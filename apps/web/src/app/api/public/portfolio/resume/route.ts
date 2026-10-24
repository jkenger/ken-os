import { publicResumeResponse } from "@/features/portfolio/public-resume";
import { renderResumePdf } from "@/features/profile/resume-pdf";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return publicResumeResponse(request, renderResumePdf);
}
