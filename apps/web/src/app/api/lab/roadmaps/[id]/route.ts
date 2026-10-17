import { labRoute } from "@/features/engineering-lab/api";
import { deleteRoadmap } from "@/features/engineering-lab/roadmap-store";

export const runtime = "nodejs";

/** The owner deletes a roadmap; its topics keep their progress. */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => deleteRoadmap(session.userId, (await params).id), { write: true });
}
