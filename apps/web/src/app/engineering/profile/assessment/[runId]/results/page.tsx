import { notFound, redirect } from "next/navigation";
import { LabAssessment } from "@/components/lab/assessment/lab-assessment";
import { getRunView } from "@/features/engineering-lab/assessment-run";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { completedBaseline } from "@/features/engineering-lab/run-state";
import { engineering } from "@/features/engineering-lab/routes";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** A finished run's results at a stable address. An unfinished run goes back to the assessment, where it continues. */
export default async function ResultsPage({ params }: { params: Promise<{ runId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { runId } = await params;
  const [run, profile, baselineRun] = await Promise.all([getRunView(session.userId, runId).catch(() => null), getProfileRow(session.userId), completedBaseline(session.userId)]);
  if (!run) notFound();
  if (!run.completedAt) redirect(engineering.assessment({ run: run.id }));
  return <LabAssessment email={session.email} intake={profile?.intake ?? null} conversation={(profile?.conversation ?? []).slice(-12)} run={run} focus={null} baselineDone={Boolean(baselineRun)} />;
}
