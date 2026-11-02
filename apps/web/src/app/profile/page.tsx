import type { Metadata } from "next";
import { ProfileWorkspace } from "@/features/profile/profile-workspace";
import { listResumeFiles } from "@/features/profile/resume-files-store";
import { isLedgerSection } from "@/features/profile/ledger";
import { getProfile, latestAnalysis } from "@/features/profile/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profile · KEOS" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const session = await requireSession("/profile");
  const { section } = await searchParams;
  const opened = Array.isArray(section) ? section[0] : section;
  const [profile, resumes, analysis] = await Promise.all([
    getProfile(session.userId),
    listResumeFiles(session.userId),
    latestAnalysis(session.userId),
  ]);
  return (
    <ProfileWorkspace
      email={session.email}
      profile={profile}
      resumes={resumes}
      analysis={analysis}
      initialSection={opened && isLedgerSection(opened) ? opened : null}
    />
  );
}
