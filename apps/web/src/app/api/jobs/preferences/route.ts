import { jobsRoute } from "@/features/jobs/api";
import { parsePreferences, savePreferences } from "@/features/jobs/preferences-store";
import { refilterExisting } from "@/features/jobs/store";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  return jobsRoute(request, async (session, body) => {
    const preferences = parsePreferences(body);
    await savePreferences(session.userId, preferences);
    // Changing a setting refilters existing postings without a new alert (docs/product/job-finder.md).
    await refilterExisting(session.userId);
    return preferences;
  });
}
