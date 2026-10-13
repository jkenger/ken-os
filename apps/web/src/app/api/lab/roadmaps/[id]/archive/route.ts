import { labRoute } from "@/features/engineering-lab/api";
import { archiveRoadmap } from "@/features/engineering-lab/roadmap-store";

export const runtime = "nodejs";

/** Archives a roadmap; its topics keep their progress (docs/architecture/engineering-roadmaps.md, section 1). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => archiveRoadmap(session.userId, (await params).id), { write: true });
}
