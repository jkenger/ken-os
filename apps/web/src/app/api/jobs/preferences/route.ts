import { jobsRoute } from "@/features/jobs/api";
import { parsePreferences, savePreferences } from "@/features/jobs/preferences-store";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  return jobsRoute(request, async (session, body) => {
    const preferences = parsePreferences(body);
    await savePreferences(session.userId, preferences);
    return preferences;
  });
}
