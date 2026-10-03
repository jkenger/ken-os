import { labRoute, readJson } from "@/features/engineering-lab/api";
import { prepareAddedChapterScreen } from "@/features/engineering-lab/assessment-run";
import { LabInputError } from "@/features/engineering-lab/errors";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Writes the short screen for a chapter you added after the baseline. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    if (typeof body.chapterId !== "string" || body.chapterId.length > 64) throw new LabInputError("chapterId is required.");
    return prepareAddedChapterScreen(session.userId, body.chapterId);
  }, { write: true, ai: true });
}
