import { JobsPage } from "@/components/jobs/jobs-page";
import { getProfile } from "@/features/profile/store";
import { getPreferences } from "@/features/jobs/preferences-store";
import { deriveRoles } from "@/features/jobs/roles";
import { listPostings } from "@/features/jobs/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Jobs() {
  const session = await requireSession("/jobs");
  const [profile, postings, filteredOut, preferences] = await Promise.all([
    getProfile(session.userId),
    listPostings(session.userId, "new"),
    listPostings(session.userId, "filtered_out"),
    getPreferences(session.userId),
  ]);
  const derivedRoles = deriveRoles(profile.details);
  return (
    <JobsPage
      email={session.email}
      effectiveRoles={preferences.roles.length > 0 ? preferences.roles : derivedRoles}
      postings={postings}
      preferences={preferences}
      filteredOutCount={filteredOut.length}
    />
  );
}
