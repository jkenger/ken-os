import { ResumePreview } from "@/components/profile/resume-preview";
import { getProfile } from "@/features/profile/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function ResumePage() {
  const session = await requireSession("/profile/resume");
  const profile = await getProfile(session.userId);
  return <ResumePreview email={session.email} savedAt={profile.savedAt} settings={profile.resume} />;
}
