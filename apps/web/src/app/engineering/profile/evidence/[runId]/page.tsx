import { notFound, redirect } from "next/navigation";
import { Evidence } from "@/components/engineering/evidence";
import { getRunEvidence } from "@/features/engineering-lab/assessment-store";
import { topicMap } from "@/features/engineering-lab/curriculum";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EvidencePage({ params }: { params: Promise<{ runId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const run = await getRunEvidence(session.userId, (await params).runId).catch(() => null);
  if (!run) notFound();
  return <Evidence email={session.email} completedAt={run.completedAt} items={run.items} areas={topicMap.areas.map((area) => ({ id: area.id, title: area.title }))} />;
}
