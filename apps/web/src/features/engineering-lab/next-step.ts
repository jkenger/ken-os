import type { PlanDecision } from "@ken-os/domain";
import { findTopic, labsForTopic, placeOf } from "./curriculum";
import { stepsForTopic, type NextStep } from "./steps";
import { getTopicView, type TopicView } from "./store";

/** The step Today should point at for the planned topic, worked out exactly as the topic page does. */
export function nextStepFromView(plan: PlanDecision, view: Pick<TopicView, "progress" | "reviewDue" | "lesson" | "practiceResults" | "passedLabs" | "assessment">): NextStep | null {
  const topic = findTopic(plan.topicId);
  if (!topic) return null;
  const { steps, suggested } = stepsForTopic(view, labsForTopic(topic.id), topic.prove, plan.skipLesson);
  return { steps, suggested, place: placeOf(topic) };
}

export async function nextStepFor(userId: string, plan: PlanDecision | null): Promise<NextStep | null> {
  if (!plan) return null;
  return nextStepFromView(plan, await getTopicView(userId, plan.topicId));
}
