import { JobsBoardPage } from "@/features/jobs/board-page";
import { getProfile } from "@/features/profile/store";
import { listJobBoard } from "@/features/jobs/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function JobsBoard() {
  const session = await requireSession("/jobs/board");
  const [postings, profile] = await Promise.all([listJobBoard(session.userId), getProfile(session.userId)]);
  const profileSkills = profile.details.skills.flatMap((group) => group.items);
  return <JobsBoardPage email={session.email} postings={postings} profileSkills={profileSkills} />;
}
