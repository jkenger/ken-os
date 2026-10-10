import { redirect } from "next/navigation";
import { Practice } from "@/components/engineering/practice";
import { activeRun } from "@/features/engineering-lab/assessment-store";
import { getPractice, practiceCandidates, PRACTICE_MINUTES } from "@/features/engineering-lab/practice-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ summary?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const [practice, open, { summary }] = await Promise.all([getPractice(session.userId), activeRun(session.userId), searchParams]);
  const candidates = practice ? practice.items.length : (await practiceCandidates(session.userId)).length;
  return <Practice email={session.email} practice={practice} candidates={candidates} minutes={PRACTICE_MINUTES} summary={summary === "1"} closedBook={Boolean(open)} />;
}
