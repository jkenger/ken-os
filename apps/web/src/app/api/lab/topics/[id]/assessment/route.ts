import { labRoute, readJson } from "@/features/engineering-lab/api";
import { generateAssessment, LabInputError } from "@/features/engineering-lab/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    const kind = body.kind ?? "assessment";
    if (kind !== "assessment" && kind !== "review" && kind !== "placement") throw new LabInputError("kind must be assessment, review or placement.");
    return generateAssessment(session.userId, id, kind);
  }, { write: true, ai: true });
}
