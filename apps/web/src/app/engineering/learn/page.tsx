import { redirect } from "next/navigation";
import { EngineeringLearn } from "@/components/engineering/learn";
import { pathChapters } from "@/features/engineering-lab/capabilities";
import { assessorModes, careers, findTopic, topicMap } from "@/features/engineering-lab/curriculum";
import { nextStepFor } from "@/features/engineering-lab/next-step";
import { getProfileRow } from "@/features/engineering-lab/profile-store";
import { activeRun } from "@/features/engineering-lab/run-state";
import { getToday } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LearnPage() {
  const session = await getSession();
  if (!session) redirect("/");
  // A placement check needs Assessor questions, so topics proven only by labs have none.
  const assessable = topicMap.topics.filter((topic) => assessorModes(topic).length > 0).map((topic) => topic.id);
  const [today, profile, open] = await Promise.all([getToday(session.userId), getProfileRow(session.userId), activeRun(session.userId)]);
  const next = await nextStepFor(session.userId, today.plan);
  const upNext = today.plan && next ? { topicId: today.plan.topicId, title: findTopic(today.plan.topicId)?.title ?? today.plan.topicId, step: next.suggested, reason: today.plan.reason } : null;
  return (
    <EngineeringLearn
      email={session.email} map={topicMap} progress={today.progress} assessable={assessable}
      path={pathChapters(careers, profile?.direction ?? null)} upNext={upNext} closedBook={Boolean(open)}
    />
  );
}
