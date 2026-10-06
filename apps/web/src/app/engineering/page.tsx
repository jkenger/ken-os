import { redirect } from "next/navigation";
import { EngineeringOverview } from "@/components/engineering/overview";
import { capabilityRows, nextRequirement } from "@/features/engineering-lab/capabilities";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { getDailySet } from "@/features/engineering-lab/daily";
import { nextStepFor } from "@/features/engineering-lab/next-step";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getToday } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EngineeringPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [today, profile, daily, open] = await Promise.all([getToday(session.userId), getProfileView(session.userId), getDailySet(session.userId), activeRun(session.userId)]);
  const rows = capabilityRows({ careers, map: topicMap, progress: profile.progress, states: profile.chapterStates, roleId: profile.direction });
  return (
    <EngineeringOverview
      email={session.email} today={today} next={await nextStepFor(session.userId, today.plan)} profile={profile} daily={daily}
      nextRequirement={nextRequirement(rows, profile.direction)} closedBook={Boolean(open)}
    />
  );
}
