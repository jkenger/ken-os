import { labRoute, readJson } from "@/features/engineering-lab/api";
import { saveDraft } from "@/features/engineering-lab/exercise-store";

export const runtime = "nodejs";

/** Autosaves the code for one exercise version, so Claude can read it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    return saveDraft(session.userId, (await params).id, { labId: String(body.labId ?? ""), code: typeof body.code === "string" ? body.code : "" });
  }, { write: true });
}
