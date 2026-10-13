import { Profile } from "@/components/engineering/profile";
import { listConnections } from "@/features/connector/oauth-store";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { requireSession } from "@/lib/session";
import { engineering } from "@/features/engineering-lab/routes";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession(engineering.profile);
  const [view, connections] = await Promise.all([getProfileView(session.userId), listConnections(session.userId)]);
  return <Profile email={session.email} view={view} connections={connections} />;
}
