import { Profile } from "@/components/engineering/profile";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { requireSession } from "@/lib/session";
import { engineering } from "@/features/engineering-lab/routes";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSession(engineering.profile);
  return <Profile email={session.email} view={await getProfileView(session.userId)} />;
}
