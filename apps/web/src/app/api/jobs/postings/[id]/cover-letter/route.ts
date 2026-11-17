import { writeCoverLetter } from "@ken-os/agents";
import { NextResponse } from "next/server";
import { writeCoverLetterForPosting } from "@/features/jobs/cover-letter";
import { JobsInputError, jobsRoute } from "@/features/jobs/api";
import { getCoverLetter, getPosting, saveCoverLetter } from "@/features/jobs/store";
import { getProfile } from "@/features/profile/store";
import { getSession } from "@/lib/auth/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

/** Generates (or regenerates) one posting's cover letter (docs/architecture/cover-letter.md). Slice 1:
 *  unconditionally regenerates -- the force/409 edited-check for an owner-edited letter is Slice 2. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session) => {
    try {
      await writeCoverLetterForPosting({
        userId: session.userId,
        postingId: id,
        getProfile: async (userId) => (await getProfile(userId)).details,
        getPosting,
        generate: writeCoverLetter,
        save: saveCoverLetter,
      });
    } catch (error) {
      console.error("write cover letter failed", error instanceof Error ? error.message : error);
      throw new JobsInputError("Couldn't write a letter for this posting", 502);
    }
    const letter = await getCoverLetter(session.userId, id);
    return { content: letter?.content ?? "", generatedAt: letter?.generatedAt ?? null };
  });
}

/** The stored cover letter, read by the page server component. Null until the owner has generated one. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });

  const letter = await getCoverLetter(session.userId, id);
  return NextResponse.json(letter, { headers: { "Cache-Control": "no-store" } });
}
