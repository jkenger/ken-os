import { labRoute, readJson } from "@/features/engineering-lab/api";
import { startRun } from "@/features/engineering-lab/assessment-store";
import { saveIntake } from "@/features/engineering-lab/profile-store";

export const runtime = "nodejs";

/** Saves the intake and opens the assessment. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    await saveIntake(session.userId, await readJson(request));
    return startRun(session.userId);
  }, { write: true });
}
