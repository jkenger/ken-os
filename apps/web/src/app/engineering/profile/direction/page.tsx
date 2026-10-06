import { redirect } from "next/navigation";
import { LabProfile, type ProfilePane } from "@/components/lab/profile/lab-profile";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const panes: ProfilePane[] = ["shape", "levels", "roles", "chapters", "radar", "assessments", "definitions"];

/** The direction conversation with the Guide, beside roles, added chapters, radar, assessments and definitions. */
export default async function DirectionPage({ searchParams }: { searchParams: Promise<{ pane?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { pane } = await searchParams;
  const initialPane = panes.find((item) => item === pane);
  const [view, open] = await Promise.all([getProfileView(session.userId), activeRun(session.userId)]);
  return <LabProfile email={session.email} view={view} initialPane={initialPane} closedBook={Boolean(open)} />;
}
