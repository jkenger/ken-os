import { redirect } from "next/navigation";
import { Direction } from "@/components/engineering/direction";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DirectionPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const profile = await getProfileRow(session.userId);
  return <Direction email={session.email} careers={careers} map={topicMap} direction={profile?.direction ?? null} weeklyHours={profile?.weeklyHours ?? null} />;
}
