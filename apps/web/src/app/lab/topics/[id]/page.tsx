import { notFound, redirect } from "next/navigation";
import { LabTopic } from "@/components/lab/lab-topic";
import { findTopic, labsForTopic, placeOf } from "@/features/engineering-lab/curriculum";
import type { StepId } from "@/features/engineering-lab/steps";
import { getToday, getTopicView } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const STEPS: StepId[] = ["learn", "practice", "lab", "check"];

export default async function LabTopicPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ step?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const [{ id }, { step }] = await Promise.all([params, searchParams]);
  const topic = findTopic(id);
  if (!topic) notFound();
  const [view, today] = await Promise.all([getTopicView(session.userId, id), getToday(session.userId)]);
  const skipLesson = today.plan?.topicId === id && today.plan.skipLesson;
  const initialStep = STEPS.find((item) => item === step);
  return <LabTopic email={session.email} topic={topic} view={view} labs={labsForTopic(id)} skipLesson={skipLesson} place={placeOf(topic)} initialStep={initialStep} />;
}
