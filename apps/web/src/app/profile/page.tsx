import { ProfileWorkspace } from "@/components/profile/profile-workspace";
import { listResumeFiles } from "@/features/profile/resume-files-store";
import { isLedgerSection } from "@/features/profile/ledger";
import { getProfile } from "@/features/profile/store";
import { getPortfolio, liveSnapshotFor } from "@/features/portfolio/store";
import { engineeringSummary } from "@/features/engineering-lab/roadmap-store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const session = await requireSession("/profile");
  const { section } = await searchParams;
  const opened = Array.isArray(section) ? section[0] : section;
  const [profile, resumes, engineering, portfolio, snapshot] = await Promise.all([
    getProfile(session.userId),
    listResumeFiles(session.userId),
    // The Engineering line is a convenience; Profile still loads if it fails.
    engineeringSummary(session.userId).catch(() => null),
    getPortfolio(session.userId),
    liveSnapshotFor(session.userId),
  ]);
  return (
    <ProfileWorkspace
      email={session.email}
      profile={profile}
      resumes={resumes}
      engineering={engineering}
      initialSection={opened && isLedgerSection(opened) ? opened : null}
      published={{ live: portfolio.live, profile: snapshot?.profile ?? null, showEmail: portfolio.showEmail }}
    />
  );
}
