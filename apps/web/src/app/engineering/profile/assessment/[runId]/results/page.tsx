import { notFound, redirect } from "next/navigation";
import { Results } from "@/components/engineering/results";
import { getRunEvidence } from "@/features/engineering-lab/assessment-store";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { engineering } from "@/features/engineering-lab/routes";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ResultsPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await requireSession(engineering.results(runId));
  const run = await getRunEvidence(session.userId, runId).catch(() => null);
  if (!run) notFound();
  // Results only exist for a finished assessment; an open one goes back to its next question.
  if (!run.completedAt) redirect(engineering.assessment);
  return (
    <Results
      email={session.email}
      runId={run.id}
      items={run.items}
      areas={topicMap.areas.map((area) => ({ id: area.id, title: area.title }))}
    />
  );
}
