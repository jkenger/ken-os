import { labRoute, readJson } from "@/features/engineering-lab/api";
import { startRun } from "@/features/engineering-lab/assessment-run";
import { LabInputError } from "@/features/engineering-lab/errors";

export const runtime = "nodejs";

/** Starts the baseline or a checkpoint, or returns the one already in progress. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    if (body.kind !== "baseline" && body.kind !== "checkpoint") throw new LabInputError("kind must be baseline or checkpoint.");
    return startRun(session.userId, body.kind);
  }, { write: true });
}
