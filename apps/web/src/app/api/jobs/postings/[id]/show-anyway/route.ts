import { jobsRoute } from "@/features/jobs/api";
import { showAnyway } from "@/features/jobs/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session) => {
    await showAnyway(session.userId, id);
    return { moved: true };
  });
}
