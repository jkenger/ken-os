import { isKnown, type TopicProgress } from "./mastery";
import type { TopicMap } from "./topics";
import type { Label, Mode } from "./types";

// The baseline assessment and its retakes. Design: docs/architecture/engineering-lab-profile.md, section 4.

export const RUN_KINDS = ["baseline", "checkpoint"] as const;
export type RunKind = (typeof RUN_KINDS)[number];

/**
 * One chapter of a run: written topics get adaptive questions, unwritten chapters get two screening questions.
 * screenFirst (runs started from 2026-10-06, assessment v2): two chapter questions come first, and topic questions
 * follow only when those weren't both solid. Runs without it ask every topic, as before.
 */
export type RunChapter =
  | { chapterId: string; kind: "topics"; topicIds: string[]; skipped: string[]; screenFirst?: boolean }
  | { chapterId: string; kind: "screen" };

export interface RunPlan {
  chapters: RunChapter[];
}

/** Screening questions per unwritten chapter: one on the basics, one applied. */
export const SCREEN_QUESTIONS = 2;

/**
 * Lays out a run in course order. Topics already proven or placed are skipped: a proof is stronger evidence than a
 * screening question, and an off-day answer shouldn't put it at risk.
 */
export function planRun(map: TopicMap, progress: TopicProgress[], extraChapters: { id: string }[] = []): RunPlan {
  const byTopic = new Map(progress.map((item) => [item.topicId, item]));
  const chapters: RunChapter[] = map.modules.map((module) => {
    const topics = map.topics.filter((topic) => topic.module === module.id);
    if (!topics.length) return { chapterId: module.id, kind: "screen" };
    const skipped = topics.filter((topic) => { const item = byTopic.get(topic.id); return item ? isKnown(item) : false; }).map((topic) => topic.id);
    const topicIds = topics.map((topic) => topic.id).filter((id) => !skipped.includes(id));
    return { chapterId: module.id, kind: "topics", topicIds, skipped, ...(topicIds.length ? { screenFirst: true } : {}) };
  });
  for (const chapter of extraChapters) chapters.push({ chapterId: chapter.id, kind: "screen" });
  return { chapters };
}

export interface ItemAnswer {
  itemIndex: number;
  label: Label;
  voided: boolean;
}

/**
 * Which question to ask next for one written topic, or null when the topic is done. Items are the topic's question
 * set, one per mode. The first question is a code-checked prediction when there is one.
 *
 * - solid: one confirming question in a second mode. Two solid answers place the topic.
 * - partial or rusty: one probing question in another mode, to find what's missing.
 * - gap or misconception: stop. The topic needs learning; more questions would only measure how much.
 *
 * A thrown-out question (its answer key was wrong) doesn't count, so the next one takes its place.
 */
export function nextTopicQuestion(itemModes: Mode[], answers: ItemAnswer[]): number | null {
  const counted = answers.filter((answer) => !answer.voided);
  const used = new Set(answers.map((answer) => answer.itemIndex));
  const open = itemModes.map((mode, index) => ({ mode, index })).filter((item) => !used.has(item.index));
  if (!counted.length) {
    if (!open.length) return null;
    return (open.find((item) => item.mode === "predict") ?? open[0]).index;
  }
  if (counted.length >= 2) return null;
  const first = counted[0];
  if (first.label === "gap" || first.label === "misconception") return null;
  const firstMode = itemModes[first.itemIndex];
  // The follow-up should test the topic another way, so prefer a mode the first answer didn't use.
  const next = open.find((item) => item.mode !== firstMode) ?? open[0];
  return next ? next.index : null;
}

export type StageOne = "pending" | "cleared" | "drill";

/**
 * What a written chapter's two stage-1 answers mean: still pending; cleared when both are solid (the chapter is done and
 * counts as "can build it", an estimate); otherwise drill into its topics. Labels in the order asked; discarded ones left out.
 */
export function stageOne(labels: Label[]): StageOne {
  if (labels.length < SCREEN_QUESTIONS) return "pending";
  return labels.slice(0, SCREEN_QUESTIONS).every((label) => label === "solid") ? "cleared" : "drill";
}

export function nextScreenQuestion(answered: number[]): number | null {
  for (let index = 0; index < SCREEN_QUESTIONS; index += 1) if (!answered.includes(index)) return index;
  return null;
}
