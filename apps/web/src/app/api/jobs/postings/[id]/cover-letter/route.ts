import { writeCoverLetter } from "@ken-os/agents";
import { NextResponse } from "next/server";
import { needsRewriteConfirmation, writeCoverLetterForPosting } from "@/features/jobs/cover-letter";
import { JobsInputError, jobsRoute } from "@/features/jobs/api";
import { getCoverLetter, getPosting, saveCoverLetter, updateCoverLetterContent } from "@/features/jobs/store";
import { getProfile } from "@/features/profile/store";
import { getSession } from "@/lib/auth/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

/** Generates (or regenerates) one posting's cover letter (docs/architecture/cover-letter.md). Body `{ force? }`:
 *  if the existing letter has been edited since it was last generated and `force` isn't set, returns `409
 *  { edited: true }` without regenerating -- the tab shows the confirm dialog and resubmits with `force: true`. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session, body) => {
    const force = body.force === true;
    const existing = await getCoverLetter(session.userId, id);
    if (
      existing &&
      needsRewriteConfirmation({ generatedAt: existing.generatedAt, updatedAt: existing.updatedAt, force })
    ) {
      throw new JobsInputError("edited", 409, { edited: true });
    }
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

/** The owner's own manual edit, not a regenerate (docs/architecture/cover-letter.md) -- updates `content` and
 *  moves `updatedAt`, no AI call, no fact-check: the owner is writing this text now. 404 if nothing's been
 *  generated yet, since there's nothing to edit. */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session, body) => {
    if (typeof body.content !== "string") throw new JobsInputError("content must be a string");
    const existing = await getCoverLetter(session.userId, id);
    if (!existing) throw new JobsInputError("No cover letter to edit", 404);
    const updatedAt = await updateCoverLetterContent(session.userId, id, body.content);
    return { updatedAt };
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
