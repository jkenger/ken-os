import { notFound, redirect } from "next/navigation";
import { LabTopic } from "@/components/lab/lab-topic";
import { findTopic, labsForTopic } from "@/features/engineering-lab/curriculum";
import { getToday, getTopicView } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabTopicPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { id } = await params;
  const topic = findTopic(id);
  if (!topic) notFound();
  const [view, today] = await Promise.all([getTopicView(session.userId, id), getToday(session.userId)]);
  const skipLesson = today.plan?.topicId === id && today.plan.skipLesson;
  return <LabTopic email={session.email} topic={topic} view={view} labs={labsForTopic(id)} skipLesson={skipLesson} />;
}
