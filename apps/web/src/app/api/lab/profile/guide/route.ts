import { labRoute, readJson } from "@/features/engineering-lab/api";
import { LabInputError } from "@/features/engineering-lab/errors";
import { talkToGuide } from "@/features/engineering-lab/profile-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** One turn with the Guide. Its suggestions come back for the owner to confirm. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    if (body.phase !== "intake" && body.phase !== "direction") throw new LabInputError("phase must be intake or direction.");
    if (typeof body.text !== "string") throw new LabInputError("text is required.");
    return talkToGuide(session.userId, body.phase, body.text);
  }, { write: true, ai: true });
}
