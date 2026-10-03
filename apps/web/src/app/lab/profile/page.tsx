import { redirect } from "next/navigation";
import { LabProfile } from "@/components/lab/profile/lab-profile";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <LabProfile email={session.email} view={await getProfileView(session.userId)} />;
}
