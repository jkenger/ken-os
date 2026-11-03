import { getCheckStatus } from "@/features/jobs/check-status-store";
import { JobsPage } from "@/features/jobs/jobs-page";
import { getProfile } from "@/features/profile/store";
import { getPreferences } from "@/features/jobs/preferences-store";
import { deriveRoles } from "@/features/jobs/roles";
import { getDistinctCompanies, listPostings } from "@/features/jobs/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Jobs({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const session = await requireSession("/jobs");
  const { board } = await searchParams;
  const boardFilter = board?.trim() || undefined;
  const [profile, allPostings, filteredOut, preferences, companies, checkStatus] = await Promise.all([
    getProfile(session.userId),
    listPostings(session.userId, "new"),
    listPostings(session.userId, "filtered_out"),
    getPreferences(session.userId),
    getDistinctCompanies(session.userId),
    getCheckStatus(session.userId),
  ]);
  const postings = boardFilter ? allPostings.filter((posting) => posting.originBoard === boardFilter) : allPostings;
  const derivedRoles = deriveRoles(profile.details);
  const profileSkills = profile.details.skills.flatMap((group) => group.items);
  return (
    <JobsPage
      email={session.email}
      effectiveRoles={preferences.roles.length > 0 ? preferences.roles : derivedRoles}
      derivedRoles={derivedRoles}
      postings={postings}
      profileSkills={profileSkills}
      preferences={preferences}
      companies={companies}
      filteredOutCount={filteredOut.length}
      boardFilter={boardFilter}
      checkStatus={checkStatus}
    />
  );
}
