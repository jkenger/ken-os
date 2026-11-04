import { getCheckStatus } from "@/features/jobs/check-status-store";
import { JobsPage } from "@/features/jobs/jobs-page";
import { getProfile } from "@/features/profile/store";
import { getPreferences } from "@/features/jobs/preferences-store";
import { deriveRoles } from "@/features/jobs/roles";
import { countPostings, getDistinctCompanies, listPostingsPage } from "@/features/jobs/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 10;

export default async function Jobs({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const session = await requireSession("/jobs");
  const { board } = await searchParams;
  const boardFilter = board?.trim() || undefined;
  const [profile, firstPage, newCount, filteredOutCount, preferences, companies, checkStatus] = await Promise.all([
    getProfile(session.userId),
    listPostingsPage(session.userId, {
      state: "new",
      search: "",
      sort: "score",
      board: boardFilter,
      cursorValue: null,
      cursorId: null,
      limit: PAGE_SIZE,
    }),
    countPostings(session.userId, "new", boardFilter),
    countPostings(session.userId, "filtered_out"),
    getPreferences(session.userId),
    getDistinctCompanies(session.userId),
    getCheckStatus(session.userId),
  ]);
  const derivedRoles = deriveRoles(profile.details);
  const profileSkills = profile.details.skills.flatMap((group) => group.items);
  return (
    <JobsPage
      email={session.email}
      effectiveRoles={preferences.roles.length > 0 ? preferences.roles : derivedRoles}
      derivedRoles={derivedRoles}
      initialPostings={firstPage.postings}
      initialHasMore={firstPage.hasMore}
      newCount={newCount}
      profileSkills={profileSkills}
      preferences={preferences}
      companies={companies}
      filteredOutCount={filteredOutCount}
      boardFilter={boardFilter}
      checkStatus={checkStatus}
    />
  );
}
