import { JobsInputError, jobsRoute } from "@/features/jobs/api";
import { setSaved } from "@/features/jobs/store";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return jobsRoute(request, async (session, body) => {
    if (typeof body.saved !== "boolean") throw new JobsInputError("saved must be true or false");
    await setSaved(session.userId, id, body.saved);
    return { saved: body.saved };
  });
}
