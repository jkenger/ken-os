import { labRoute } from "@/features/engineering-lab/api";
import { restoreRoadmap } from "@/features/engineering-lab/roadmap-store";

export const runtime = "nodejs";

/** Brings an archived roadmap back, if fewer than 3 are active (docs/architecture/engineering-roadmaps.md, section 1). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => restoreRoadmap(session.userId, (await params).id), { write: true });
}
