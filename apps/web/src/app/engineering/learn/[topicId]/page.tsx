import { notFound } from "next/navigation";
import { TopicPage } from "@/components/engineering/topic";
import { findTopic, placeOf, topicMap } from "@/features/engineering-lab/curriculum";
import type { TopicStep } from "@/features/engineering-lab/routes";
import { provenTopics } from "@/features/engineering-lab/store";
import { getExercisePanel } from "@/features/engineering-lab/exercise-store";
import { getTopicView } from "@/features/engineering-lab/topic-store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const STEPS: TopicStep[] = ["learn", "exercise", "prove"];

export default async function TopicRoute({
  params,
  searchParams,
}: {
  params: Promise<{ topicId: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const [{ topicId }, { step }] = await Promise.all([params, searchParams]);
  const session = await requireSession(`/engineering/learn/${encodeURIComponent(topicId)}`, { step });
  const topic = findTopic(topicId);
  if (!topic) notFound();
  const [view, exercise, proven] = await Promise.all([
    getTopicView(session.userId, topicId),
    getExercisePanel(session.userId, topic),
    provenTopics(session.userId),
  ]);
  // The next topic in course order that isn't proven yet.
  const after = topicMap.topics
    .slice(topicMap.topics.indexOf(topic) + 1)
    .concat(topicMap.topics.slice(0, topicMap.topics.indexOf(topic)));
  const next = after.find((item) => !proven.has(item.id));
  return (
    <TopicPage
      email={session.email}
      topic={topic}
      place={placeOf(topic)}
      exercise={exercise}
      view={view}
      initialStep={STEPS.find((item) => item === step) ?? "learn"}
      nextTopic={next ? { id: next.id, title: next.title } : null}
    />
  );
}
