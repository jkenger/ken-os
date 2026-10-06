import { notFound, redirect } from "next/navigation";
import { EngineeringEvidence } from "@/components/engineering/evidence";
import { getEvidence } from "@/features/engineering-lab/evidence";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EvidencePage({ params }: { params: Promise<{ attemptId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { attemptId } = await params;
  const [view, open] = await Promise.all([getEvidence(session.userId, attemptId), activeRun(session.userId)]);
  // Another owner's answer is reported the same way as a missing one.
  if (!view) notFound();
  return <EngineeringEvidence email={session.email} view={view} closedBook={Boolean(open)} />;
}
