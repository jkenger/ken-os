import { redirect } from "next/navigation";
import { LabToday } from "@/components/lab/lab-today";
import { nextStepFor } from "@/features/engineering-lab/next-step";
import { getToday } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const today = await getToday(session.userId);
  return <LabToday email={session.email} today={today} next={await nextStepFor(session.userId, today.plan)} />;
}
