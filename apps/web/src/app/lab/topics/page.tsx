import { redirect } from "next/navigation";
import { LabTopics } from "@/components/lab/lab-topics";
import { assessorModes, topicMap } from "@/features/engineering-lab/curriculum";
import { getAllProgress } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabTopicsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  // A placement check needs Assessor questions, so topics proven only by labs can't have one.
  const assessable = topicMap.topics.filter((topic) => assessorModes(topic).length > 0).map((topic) => topic.id);
  return <LabTopics email={session.email} map={topicMap} progress={await getAllProgress(session.userId)} assessable={assessable} />;
}
