import { labRoute } from "@/features/engineering-lab/api";
import { generateLesson } from "@/features/engineering-lab/topic-store";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Writes the topic's lesson from trusted sources. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => generateLesson(session.userId, (await params).id), { write: true, ai: true });
}
