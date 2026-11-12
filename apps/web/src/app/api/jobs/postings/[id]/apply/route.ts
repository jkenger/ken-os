import { jobsRoute } from "@/features/jobs/api";
import { markApplied } from "@/features/jobs/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session) => {
    await markApplied(session.userId, id);
    return { applied: true };
  });
}
