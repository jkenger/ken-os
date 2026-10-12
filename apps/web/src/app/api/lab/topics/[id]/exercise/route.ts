import { labRoute, readJson } from "@/features/engineering-lab/api";
import { recordExerciseRun } from "@/features/engineering-lab/topic-store";

export const runtime = "nodejs";

/** Records one run of the topic's exercise. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return recordExerciseRun(session.userId, (await params).id, {
        labId: String(body.labId ?? ""),
        code: typeof body.code === "string" ? body.code : "",
        passed: Number(body.passed),
        failed: Number(body.failed),
        output: typeof body.output === "string" ? body.output : "",
      });
    },
    { write: true },
  );
}
