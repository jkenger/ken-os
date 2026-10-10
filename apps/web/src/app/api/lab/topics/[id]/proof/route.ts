import { labRoute } from "@/features/engineering-lab/api";
import { getOrWriteProof } from "@/features/engineering-lab/topic-store";

export const runtime = "nodejs";
export const maxDuration = 120;

/** The proof prompt, written by the Assessor once the exercise has passed. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => getOrWriteProof(session.userId, (await params).id), { write: true });
}
