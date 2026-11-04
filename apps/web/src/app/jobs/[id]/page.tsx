import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { BackToJobsLink } from "@/features/jobs/back-to-jobs-link";
import { NewList } from "@/features/jobs/new-list";
import { PostingDetail } from "@/features/jobs/posting-detail";
import { getPreferences } from "@/features/jobs/preferences-store";
import { getProfile } from "@/features/profile/store";
import { getPosting, getRelatedByRole, getRelatedPostings } from "@/features/jobs/store";
import { yearsOfExperience } from "@/features/jobs/years-of-experience";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function JobPosting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(`/jobs/${id}`);
  const [posting, profile, preferences] = await Promise.all([
    getPosting(session.userId, id),
    getProfile(session.userId),
    getPreferences(session.userId),
  ]);
  if (!posting) notFound();

  const [related, relatedByRole] = await Promise.all([
    getRelatedPostings(session.userId, posting.company, posting.id),
    getRelatedByRole(session.userId, posting.title, posting.company, posting.id),
  ]);
  const profileSkills = profile.details.skills.flatMap((group) => group.items);
  return (
    <WorkspaceShell email={session.email} active="jobs" extraCrumb={posting.title}>
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-7xl px-page pt-page pb-section">
        <BackToJobsLink />
        <PostingDetail
          posting={posting}
          profileSkills={profileSkills}
          yearsExperience={profile.details.experience.length > 0 ? yearsOfExperience(profile.details.experience) : null}
          preferredWorkSetups={preferences.workSetups}
        />
        {related.length > 0 && (
          <div className="mt-8 grid gap-3">
            <h2 className="text-sm font-semibold">More from {posting.company}</h2>
            <NewList postings={related} profileSkills={profileSkills} />
          </div>
        )}
        {relatedByRole.length > 0 && (
          <div className="mt-8 grid gap-3">
            <h2 className="text-sm font-semibold">More {posting.title} roles</h2>
            <NewList postings={relatedByRole} profileSkills={profileSkills} />
          </div>
        )}
      </div>
    </WorkspaceShell>
  );
}
