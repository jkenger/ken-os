import { labRoute } from "@/features/engineering-lab/api";
import { generateLesson } from "@/features/engineering-lab/store";

export const runtime = "nodejs";
// Research (when sources are stale) plus the Tutor can take a minute or two.
export const maxDuration = 300;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return labRoute(request, (session) => generateLesson(session.userId, id), { write: true, ai: true });
}
