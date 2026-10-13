import { labRoute } from "@/features/engineering-lab/api";
import { markRoadmapOpened } from "@/features/engineering-lab/roadmap-store";

export const runtime = "nodejs";

/** Remembers the roadmap the owner opened, so it opens next time (docs/architecture/engineering-roadmaps.md, section 1). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      await markRoadmapOpened(session.userId, (await params).id);
      return { opened: true };
    },
    { write: true },
  );
}
