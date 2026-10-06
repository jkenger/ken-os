import { redirect } from "next/navigation";
import { LabPractice } from "@/components/lab/practice/lab-practice";
import { getDailySet } from "@/features/engineering-lab/daily";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [daily, open] = await Promise.all([getDailySet(session.userId), activeRun(session.userId)]);
  return <LabPractice email={session.email} daily={daily} closedBook={Boolean(open)} />;
}
