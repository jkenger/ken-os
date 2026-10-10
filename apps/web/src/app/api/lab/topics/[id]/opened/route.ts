import { labRoute } from "@/features/engineering-lab/api";
import { openLesson } from "@/features/engineering-lab/topic-store";

export const runtime = "nodejs";

/** The lesson was shown: the topic moves to Learning. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => openLesson(session.userId, (await params).id), { write: true });
}
