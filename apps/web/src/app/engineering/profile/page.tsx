import { redirect } from "next/navigation";
import { EngineeringProfile } from "@/components/engineering/profile";
import { capabilityRows, nextRequirement } from "@/features/engineering-lab/capabilities";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { recentEvidence } from "@/features/engineering-lab/evidence";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [view, evidence, open] = await Promise.all([getProfileView(session.userId), recentEvidence(session.userId), activeRun(session.userId)]);
  const rows = capabilityRows({
    careers, map: topicMap, progress: view.progress, states: view.chapterStates, baselineStates: view.baselineChapterStates, roleId: view.direction,
    extraTitles: Object.fromEntries(view.addedChapters.map((chapter) => [chapter.id, chapter.title])),
  });
  return <EngineeringProfile email={session.email} view={view} rows={rows} next={nextRequirement(rows, view.direction)} evidence={evidence} closedBook={Boolean(open)} />;
}
