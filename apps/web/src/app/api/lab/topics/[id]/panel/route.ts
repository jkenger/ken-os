import { labRoute } from "@/features/engineering-lab/api";
import { getTopicPanel } from "@/features/engineering-lab/roadmap-store";

export const runtime = "nodejs";

/** The roadmap's topic panel: status, reports and notes. `?roadmap=` is the roadmap it was opened on. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const roadmapId = new URL(request.url).searchParams.get("roadmap");
  return labRoute(request, async (session) => getTopicPanel(session.userId, (await params).id, roadmapId), {
    write: false,
  });
}
