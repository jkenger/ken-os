import { notFound } from "next/navigation";
import { Evidence } from "@/components/engineering/evidence";
import { getRunEvidence } from "@/features/engineering-lab/assessment-store";
import { topicMap } from "@/features/engineering-lab/curriculum";
import { requireSession } from "@/lib/session";
import { engineering } from "@/features/engineering-lab/routes";

export const dynamic = "force-dynamic";

export default async function EvidencePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const session = await requireSession(engineering.evidence(runId));
  const run = await getRunEvidence(session.userId, runId).catch(() => null);
  if (!run) notFound();
  return (
    <Evidence
      email={session.email}
      completedAt={run.completedAt}
      items={run.items}
      areas={topicMap.areas.map((area) => ({ id: area.id, title: area.title }))}
    />
  );
}
