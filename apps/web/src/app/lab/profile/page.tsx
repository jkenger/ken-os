import { redirect } from "next/navigation";
import { LabProfile, type ProfilePane } from "@/components/lab/profile/lab-profile";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const panes: ProfilePane[] = ["shape", "levels", "roles", "chapters", "radar", "assessments", "definitions"];

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ pane?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { pane } = await searchParams;
  const initialPane = panes.find((item) => item === pane);
  return <LabProfile email={session.email} view={await getProfileView(session.userId)} initialPane={initialPane} />;
}
