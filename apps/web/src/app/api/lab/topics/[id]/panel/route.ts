import { labRoute } from "@/features/engineering-lab/api";
import { getTopicPanel } from "@/features/engineering-lab/roadmap-store";

export const runtime = "nodejs";

/** The roadmap's topic panel: status, reports and notes. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => getTopicPanel(session.userId, (await params).id), { write: false });
}
