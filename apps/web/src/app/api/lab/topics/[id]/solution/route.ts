import { labRoute, readJson } from "@/features/engineering-lab/api";
import { openSolution } from "@/features/engineering-lab/topic-store";

export const runtime = "nodejs";

/** Shows the exercise's solution. The exercise must then pass again before Prove opens. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => openSolution(session.userId, (await params).id, String((await readJson(request)).labId ?? "")),
    { write: true },
  );
}
