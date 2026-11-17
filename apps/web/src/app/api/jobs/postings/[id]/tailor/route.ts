import { selectTailoredEntries } from "@ken-os/agents";
import { NextResponse } from "next/server";
import { JobsInputError, jobsRoute } from "@/features/jobs/api";
import { getPosting, getTailoredResume, saveTailoredResume } from "@/features/jobs/store";
import { tailorResume } from "@/features/jobs/tailor";
import { resumePdfHeaders } from "@/features/profile/api";
import { renderResumePdf } from "@/features/profile/resume-pdf";
import { getProfile } from "@/features/profile/store";
import { getSession } from "@/lib/auth/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

/** Generates (or regenerates) one posting's tailored resume (docs/architecture/cv-tailoring.md). Wires
 *  `tailorResume`'s injected dependencies to the real AI call, renderer and store. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session) => {
    try {
      await tailorResume({
        userId: session.userId,
        postingId: id,
        getProfile,
        getPosting,
        selectEntries: selectTailoredEntries,
        render: renderResumePdf,
        save: saveTailoredResume,
      });
    } catch (error) {
      console.error("tailor resume failed", error instanceof Error ? error.message : error);
      throw new JobsInputError("Couldn't generate. Try again", 502);
    }
    return { ok: true };
  });
}

/** The stored tailored resume's bytes, opened directly as a link (`use-tailor-flow.tsx`), not fetched. 404 until
 *  the owner has generated one. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });

  const resume = await getTailoredResume(session.userId, id);
  if (!resume) return NextResponse.json({ error: "No tailored resume yet" }, { status: 404 });

  return new NextResponse(new Uint8Array(resume.data), {
    headers: resumePdfHeaders("Tailored Resume.pdf", false),
  });
}
