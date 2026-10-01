import { labRoute } from "@/features/engineering-lab/api";
import { revealSolution } from "@/features/engineering-lab/store";

export const runtime = "nodejs";

// POST, not GET: revealing a solution is recorded, and later passes of this lab stop counting as proof.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return labRoute(request, async (session) => ({ solution: await revealSolution(session.userId, id) }), { write: true });
}
