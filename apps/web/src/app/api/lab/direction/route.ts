import { labRoute, readJson } from "@/features/engineering-lab/api";
import { saveDirection } from "@/features/engineering-lab/profile-store";

export const runtime = "nodejs";

/** Saves the target role and hours per week. Evidence never changes. */
export async function PUT(request: Request) {
  return labRoute(request, async (session) => saveDirection(session.userId, await readJson(request)), { write: true });
}
