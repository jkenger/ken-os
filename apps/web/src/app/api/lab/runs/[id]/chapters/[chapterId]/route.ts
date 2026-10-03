import { labRoute } from "@/features/engineering-lab/api";
import { prepareChapter } from "@/features/engineering-lab/assessment-run";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Writes one chapter's questions in a single AI call. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { id, chapterId } = await params;
  return labRoute(request, (session) => prepareChapter(session.userId, id, chapterId), { write: true, ai: true });
}
