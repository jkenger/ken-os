import { redirect } from "next/navigation";
import { EngineeringAssessment } from "@/components/engineering/assessment";
import { getRunView, latestRun } from "@/features/engineering-lab/assessment-run";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { activeRun, completedBaseline } from "@/features/engineering-lab/run-state";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ run?: string; chapter?: string; new?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { run: runParam, chapter, new: fresh } = await searchParams;
  const [profile, open, baselineRun] = await Promise.all([getProfileRow(session.userId), activeRun(session.userId), completedBaseline(session.userId)]);
  // An open run comes first; otherwise the run asked for, or the latest one. "?new=1" shows the start screen for a checkpoint.
  const runId = runParam ?? open?.id ?? (fresh ? null : (await latestRun(session.userId))?.id ?? null);
  const run = runId ? await getRunView(session.userId, runId, chapter).catch(() => null) : null;
  return (
    <EngineeringAssessment email={session.email} intake={profile?.intake ?? null} run={run} baselineDone={Boolean(baselineRun)} />
  );
}
