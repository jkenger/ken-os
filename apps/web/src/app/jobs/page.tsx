import { JobsPage } from "@/components/jobs/jobs-page";
import { getProfile } from "@/features/profile/store";
import { deriveRoles } from "@/features/jobs/roles";
import { listPostings } from "@/features/jobs/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Jobs() {
  const session = await requireSession("/jobs");
  const [profile, postings] = await Promise.all([getProfile(session.userId), listPostings(session.userId, "new")]);
  return <JobsPage email={session.email} roles={deriveRoles(profile.details)} postings={postings} />;
}
