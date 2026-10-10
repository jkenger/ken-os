import { redirect } from "next/navigation";
import { Assessment, Intake } from "@/components/engineering/assessment";
import { activeRun, getRunView } from "@/features/engineering-lab/assessment-store";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

// The open assessment, or the intake that starts a new one.
export default async function AssessmentPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const open = await activeRun(session.userId);
  const areas = topicMap.areas.map((area) => ({ id: area.id, title: area.title }));
  if (open) return <Assessment email={session.email} run={await getRunView(session.userId, open.id)} areas={areas} />;
  const profile = await getProfileRow(session.userId);
  return <Intake email={session.email} intake={profile?.intake ?? null} roles={careers.roles.map((role) => ({ id: role.id, title: role.title }))} />;
}
