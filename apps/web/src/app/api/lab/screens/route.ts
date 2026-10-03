import { labRoute, readJson } from "@/features/engineering-lab/api";
import { submitScreenAnswer } from "@/features/engineering-lab/assessment-run";
import { LabInputError } from "@/features/engineering-lab/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Grades a chapter screening answer. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    if (typeof body.screenId !== "string" || body.screenId.length > 64) throw new LabInputError("screenId is required.");
    if (typeof body.text !== "string" || body.text.length > 6000) throw new LabInputError("text must be up to 6000 characters.");
    if (!Number.isInteger(body.selfRating)) throw new LabInputError("selfRating must be a whole number.");
    return submitScreenAnswer(session.userId, { screenId: body.screenId, text: body.text, selfRating: body.selfRating as number });
  }, { write: true, ai: true });
}
