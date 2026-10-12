import { Direction } from "@/components/engineering/direction";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { requireSession } from "@/lib/session";
import { engineering } from "@/features/engineering-lab/routes";

export const dynamic = "force-dynamic";

export default async function DirectionPage() {
  const session = await requireSession(engineering.direction);
  const profile = await getProfileRow(session.userId);
  return (
    <Direction
      email={session.email}
      careers={careers}
      map={topicMap}
      direction={profile?.direction ?? null}
      weeklyHours={profile?.weeklyHours ?? null}
    />
  );
}
