import { redirect } from "next/navigation";
import { LabTopics } from "@/components/lab/lab-topics";
import { pathChapters } from "@/features/engineering-lab/capabilities";
import { assessorModes, careers, topicMap } from "@/features/engineering-lab/curriculum";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getAllProgress } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const session = await getSession();
  if (!session) redirect("/");
  // A placement check needs Assessor questions, so topics proven only by labs have none.
  const assessable = topicMap.topics.filter((topic) => assessorModes(topic).length > 0).map((topic) => topic.id);
  const [progress, profile, open] = await Promise.all([getAllProgress(session.userId), getProfileRow(session.userId), activeRun(session.userId)]);
  return <LabTopics email={session.email} map={topicMap} progress={progress} assessable={assessable} path={pathChapters(careers, profile?.direction ?? null)} closedBook={Boolean(open)} />;
}
