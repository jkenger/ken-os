import { redirect } from "next/navigation";
import { LabPractice } from "@/components/lab/practice/lab-practice";
import { getDailySet } from "@/features/engineering-lab/daily";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <LabPractice email={session.email} daily={await getDailySet(session.userId)} />;
}
