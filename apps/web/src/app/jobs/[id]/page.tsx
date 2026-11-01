import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PostingDetail } from "@/components/jobs/posting-detail";
import { getProfile } from "@/features/profile/store";
import { getPosting } from "@/features/jobs/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function JobPosting({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession(`/jobs/${id}`);
  const [posting, profile] = await Promise.all([getPosting(session.userId, id), getProfile(session.userId)]);
  if (!posting) notFound();

  const profileSkills = profile.details.skills.flatMap((group) => group.items);
  return (
    <WorkspaceShell email={session.email} active="jobs">
      <div className="mx-auto min-h-[calc(100vh-88px)] w-full max-w-6xl px-page pt-page pb-section">
        <PostingDetail posting={posting} profileSkills={profileSkills} />
      </div>
    </WorkspaceShell>
  );
}
