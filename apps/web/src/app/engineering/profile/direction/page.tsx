import { redirect } from "next/navigation";
import { EngineeringDirection } from "@/components/engineering/direction";
import { getProfileView } from "@/features/engineering-lab/profile-store";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Choose a direction: role, what it needs, pace; the Guide and definitions open as dialogs. Old ?pane= links still land here. */
export default async function DirectionPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [view, open] = await Promise.all([getProfileView(session.userId), activeRun(session.userId)]);
  return <EngineeringDirection email={session.email} view={view} closedBook={Boolean(open)} />;
}
