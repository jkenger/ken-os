import type { TopicProgress } from "./mastery";
import type { Topic, TopicMap } from "./topics";
import type { Mode } from "./types";

export interface PlanDecision {
  topicId: string;
  kind: "review" | "continue" | "prerequisite" | "new";
  /** One sentence shown on Today. */
  reason: string;
  depth: Topic["depth"];
  prove: Mode[];
  /** True when the baseline already rated the topic solid: go straight to proof, no lesson. */
  skipLesson: boolean;
}

export interface PlanInput {
  map: TopicMap;
  progress: TopicProgress[];
  /** Latest graded label per topic, newest attempt only, used for the prerequisite redirect. */
  latestLabel: Record<string, string | undefined>;
  now: Date;
}

/**
 * Picks what to study next with plain rules, in this order:
 * due reviews, topics in progress (redirecting to a weak prerequisite after a misconception), then the next new topic
 * whose prerequisites are all validated.
 */
export function planNext({ map, progress, latestLabel, now }: PlanInput): PlanDecision | null {
  const byId = new Map(map.topics.map((topic) => [topic.id, topic]));
  const status = (id: string) => progress.find((item) => item.topicId === id)?.status ?? "NOT_STARTED";
  const entry = (id: string) => progress.find((item) => item.topicId === id);
  const decide = (topic: Topic, kind: PlanDecision["kind"], reason: string): PlanDecision => ({
    topicId: topic.id,
    kind,
    reason,
    depth: topic.depth,
    prove: topic.prove,
    skipLesson: entry(topic.id)?.baselineLabel === "solid" && kind === "new",
  });

  const revisit = map.topics.find((topic) => status(topic.id) === "NEEDS_REVISIT");
  if (revisit) return decide(revisit, "review", `${revisit.title} slipped on a later check, so it comes back before anything new.`);
  const due = map.topics
    .map((topic) => ({ topic, at: entry(topic.id)?.nextReviewAt }))
    .filter((item): item is { topic: Topic; at: string } => status(item.topic.id) === "VALIDATED" && Boolean(item.at) && new Date(item.at!) <= now)
    .sort((a, b) => a.at.localeCompare(b.at))[0];
  if (due) return decide(due.topic, "review", `A review of ${due.topic.title} is due.`);

  const weakPrerequisite = (topic: Topic, seen = new Set<string>()): Topic | null => {
    for (const id of topic.requires) {
      if (seen.has(id)) continue;
      seen.add(id);
      const required = byId.get(id)!;
      if (status(id) === "VALIDATED") continue;
      return weakPrerequisite(required, seen) ?? required;
    }
    return null;
  };

  const inProgress = map.topics
    .filter((topic) => status(topic.id) === "LEARNING" || status(topic.id) === "PRACTICING")
    .sort((a, b) => (entry(b.id)?.lastAttemptAt ?? "").localeCompare(entry(a.id)?.lastAttemptAt ?? ""))[0];
  if (inProgress) {
    if (latestLabel[inProgress.id] === "misconception") {
      const prerequisite = weakPrerequisite(inProgress);
      if (prerequisite) {
        return decide(prerequisite, "prerequisite", `Your last ${inProgress.title} answer showed a misconception, and it builds on ${prerequisite.title}, which isn't proven yet.`);
      }
    }
    return decide(inProgress, "continue", `Pick up ${inProgress.title} where you left off.`);
  }

  const moduleOrder = new Map(map.modules.map((module, index) => [module.id, index]));
  const next = [...map.topics]
    .sort((a, b) => moduleOrder.get(a.module)! - moduleOrder.get(b.module)!)
    .find((topic) => status(topic.id) === "NOT_STARTED" && topic.requires.every((id) => status(id) === "VALIDATED"));
  if (!next) return null;
  const solid = entry(next.id)?.baselineLabel === "solid";
  return decide(next, "new", solid
    ? `The baseline rated ${next.title} solid, so this is a short check rather than a lesson.`
    : next.requires.length
      ? `Everything it builds on is proven. The gap to repair: ${next.gap.split(". ")[0]}.`
      : `First in the map with nothing to build on. The gap to repair: ${next.gap.split(". ")[0]}.`);
}
