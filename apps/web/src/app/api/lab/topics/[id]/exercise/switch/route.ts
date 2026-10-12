import { labRoute, readJson } from "@/features/engineering-lab/api";
import { switchExercise } from "@/features/engineering-lab/exercise-store";

export const runtime = "nodejs";

/** Moves to a newer exercise version from Claude: a fresh attempt. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    return switchExercise(session.userId, (await params).id, String(body.labId ?? ""));
  }, { write: true });
}
