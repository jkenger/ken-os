import { JobsSettingsPage } from "@/components/jobs/settings-page";
import { getProfile } from "@/features/profile/store";
import { getPreferences } from "@/features/jobs/preferences-store";
import { deriveRoles } from "@/features/jobs/roles";
import { getScraperState } from "@/features/jobs/scraper-state";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JobsSettings() {
  const session = await requireSession("/jobs/settings");
  const [profile, preferences, linkedInState] = await Promise.all([
    getProfile(session.userId),
    getPreferences(session.userId),
    getScraperState(session.userId, "linkedin"),
  ]);
  return (
    <JobsSettingsPage
      email={session.email}
      roles={deriveRoles(profile.details)}
      preferences={preferences}
      linkedInState={linkedInState}
    />
  );
}
