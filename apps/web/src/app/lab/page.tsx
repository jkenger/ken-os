import { redirect } from "next/navigation";
import { LabToday } from "@/components/lab/lab-today";
import { getDailySet } from "@/features/engineering-lab/daily";
import { nextStepFor } from "@/features/engineering-lab/next-step";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { getToday } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [today, profile, daily] = await Promise.all([getToday(session.userId), getProfileView(session.userId), getDailySet(session.userId)]);
  return <LabToday email={session.email} today={today} next={await nextStepFor(session.userId, today.plan)} profile={profile} daily={daily} />;
}
