import { redirect } from "next/navigation";
import { Profile } from "@/components/engineering/profile";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <Profile email={session.email} view={await getProfileView(session.userId)} />;
}
