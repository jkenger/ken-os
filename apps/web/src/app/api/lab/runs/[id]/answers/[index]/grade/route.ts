import { labRoute } from "@/features/engineering-lab/api";
import { retryGrade } from "@/features/engineering-lab/assessment-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Grades a saved answer again after grading failed. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string; index: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const { id, index } = await params;
      return retryGrade(session.userId, id, Number(index));
    },
    { write: true },
  );
}
