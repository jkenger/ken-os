import type { TopicMap } from "@ken-os/domain";

// Checks a roadmap Claude proposes before it's saved (docs/architecture/engineering-claude-first.md, section 3). Chapters
// and topics come from the reviewed topic map where they can; Claude may add its own, each with 3 to 5 lines the owner
// should be able to explain. Pure, so the rules are tested without a database.

export const PLAN_LIMITS = { chapters: 20, topicsPerChapter: 15, goal: 120, title: 80, line: 200 } as const;

/** A topic in a plan: a topic map id or an id Claude added earlier, or a new topic. */
export type PlanTopic = string | { title: string; explain: string[] };

export interface PlanInput {
  goal: string;
  chapters: { chapterId?: string; title?: string; topics: PlanTopic[] }[];
}

export interface Plan {
  goal: string;
  chapters: { id: string; title: string; topicIds: string[] }[];
  /** Topics Claude adds in this plan, to store with their lines. */
  newTopics: { id: string; title: string; lines: string[] }[];
}

/** A plan that breaks the rules. The message is written for Claude to fix and resend. */
export class PlanError extends Error {}

/** `custom.<slug>`, made from a title. */
export function customId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/, "");
  return `custom.${slug || "topic"}`;
}

function uniqueId(base: string, taken: Set<string>) {
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}_${n}`;
  taken.add(id);
  return id;
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();

/**
 * Turns Claude's proposal into a roadmap to save. `customTopics` holds the ids of topics Claude added to earlier roadmaps,
 * which a new plan may reuse.
 */
export function normalizePlan(input: PlanInput, map: TopicMap, customTopics: ReadonlySet<string>): Plan {
  const goal = clean(input.goal);
  if (!goal) throw new PlanError("Name the goal");
  if (goal.length > PLAN_LIMITS.goal) throw new PlanError(`Keep the goal under ${PLAN_LIMITS.goal} characters`);
  if (!input.chapters.length) throw new PlanError("A roadmap needs at least one chapter");
  if (input.chapters.length > PLAN_LIMITS.chapters) throw new PlanError(`Use at most ${PLAN_LIMITS.chapters} chapters`);

  const taken = new Set<string>([
    ...map.topics.map((topic) => topic.id),
    ...customTopics,
    ...map.chapters.map((chapter) => chapter.id),
  ]);
  const used = new Set<string>();
  const newTopics: Plan["newTopics"] = [];

  const chapters = input.chapters.map((chapter, index) => {
    const where = `Chapter ${index + 1}`;
    let id: string;
    let title: string;
    if (chapter.chapterId) {
      const known = map.chapters.find((item) => item.id === chapter.chapterId);
      if (!known)
        throw new PlanError(
          `${where}: no chapter "${chapter.chapterId}" in the topic map. Leave chapterId out and give a title to add one`,
        );
      id = known.id;
      title = known.title;
    } else {
      title = clean(chapter.title ?? "");
      if (!title) throw new PlanError(`${where}: give a chapterId from the topic map, or a title for a new chapter`);
      if (title.length > PLAN_LIMITS.title)
        throw new PlanError(`${where}: keep the title under ${PLAN_LIMITS.title} characters`);
      id = uniqueId(customId(title), taken);
    }
    if (!chapter.topics.length) throw new PlanError(`${where}: list at least one topic`);
    if (chapter.topics.length > PLAN_LIMITS.topicsPerChapter)
      throw new PlanError(`${where}: use at most ${PLAN_LIMITS.topicsPerChapter} topics`);

    const topicIds = chapter.topics.map((topic) => {
      if (typeof topic === "string") {
        const known = map.topics.some((item) => item.id === topic) || customTopics.has(topic);
        if (!known)
          throw new PlanError(
            `${where}: no topic "${topic}". Use an id from get_roadmap, or add it as { title, explain }`,
          );
        if (used.has(topic)) throw new PlanError(`"${topic}" is in the roadmap twice`);
        used.add(topic);
        return topic;
      }
      const topicTitle = clean(topic.title);
      const lines = topic.explain.map(clean).filter(Boolean);
      if (!topicTitle || topicTitle.length > PLAN_LIMITS.title)
        throw new PlanError(`${where}: each new topic needs a title under ${PLAN_LIMITS.title} characters`);
      if (lines.length < 3 || lines.length > 5)
        throw new PlanError(`${where}: "${topicTitle}" needs 3 to 5 lines the owner should be able to explain`);
      if (lines.some((line) => line.length > PLAN_LIMITS.line))
        throw new PlanError(`${where}: keep each line of "${topicTitle}" under ${PLAN_LIMITS.line} characters`);
      const newId = uniqueId(customId(topicTitle), taken);
      used.add(newId);
      newTopics.push({ id: newId, title: topicTitle, lines });
      return newId;
    });
    return { id, title, topicIds };
  });

  return { goal, chapters, newTopics };
}
