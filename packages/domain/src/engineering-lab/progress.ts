import type { Label } from "./types";

// Topic states and review dates. Spec: docs/architecture/engineering-rebuild.md, sections 2 and 3 (Practice).
// A topic's progress is always rebuilt from its events, the source of truth, so it can be recomputed at any time.

export const STATES = ["NOT_STARTED", "LEARNING", "PRACTICING", "PROVEN"] as const;
export type TopicState = (typeof STATES)[number];

/**
 * lesson_opened: the lesson was shown. exercise_run: the tests ran, passed or not. solution_opened: the solution was
 * shown; the exercise must then pass again before Prove opens. proof: a graded proof answer. review: a graded practice answer.
 */
export const EVENT_KINDS = ["lesson_opened", "exercise_run", "solution_opened", "proof", "review"] as const;
export type TopicEventKind = (typeof EVENT_KINDS)[number];

export interface TopicEvent {
  id: string;
  topicId: string;
  kind: TopicEventKind;
  /** exercise_run: every test passed. proof: every rubric line met. Null for the other kinds. */
  passed: boolean | null;
  /** proof and review: the grade. */
  label: Label | null;
  createdAt: Date;
}

export interface TopicProgress {
  topicId: string;
  state: TopicState;
  /** The exercise has passed since the solution was last opened, so Prove is open. */
  exercisePassed: boolean;
  /** The solution was opened after the last pass: the exercise must pass again from the starter. */
  solutionOpened: boolean;
  provenAt: string | null;
  lastActivityAt: string | null;
  /** The latest proof or review grade. */
  lastLabel: Label | null;
  /** When the topic should come back in Practice. Null until it has been proven or reviewed. */
  nextReviewAt: string | null;
  /** Days between the last review and the next. */
  reviewIntervalDays: number;
}

const DAY = 86_400_000;

/** The first review after a topic is proven comes this many days later. */
export const FIRST_REVIEW_DAYS = 3;
export const MAX_REVIEW_DAYS = 90;

/**
 * The next gap between reviews, from the grade: a solid answer doubles it, a partly-there one keeps it, a rusty one
 * starts over, and a wrong one brings the topic back tomorrow. Proven never goes back; a bad review only comes sooner.
 */
export function nextIntervalDays(previous: number, label: Label): number {
  if (label === "solid") return Math.min(Math.max(previous, FIRST_REVIEW_DAYS) * 2, MAX_REVIEW_DAYS);
  if (label === "partial") return Math.max(previous, FIRST_REVIEW_DAYS);
  if (label === "rusty") return FIRST_REVIEW_DAYS;
  return 1;
}

export function emptyProgress(topicId: string): TopicProgress {
  return {
    topicId,
    state: "NOT_STARTED",
    exercisePassed: false,
    solutionOpened: false,
    provenAt: null,
    lastActivityAt: null,
    lastLabel: null,
    nextReviewAt: null,
    reviewIntervalDays: 0,
  };
}

/**
 * Replays one topic's events in order.
 *
 * - Learning once the lesson is opened, Practicing once the exercise has run.
 * - Proven when a proof passes while the exercise stands passed (a pass after the last solution opening). Reading or
 *   passing the exercise never proves a topic on its own, and Proven never goes back.
 * - Reviews only move the next review date.
 */
export function computeProgress(topicId: string, events: readonly TopicEvent[]): TopicProgress {
  const progress = emptyProgress(topicId);
  const ordered = events
    .filter((event) => event.topicId === topicId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const rank = (state: TopicState) => STATES.indexOf(state);
  const atLeast = (state: TopicState) => {
    if (rank(progress.state) < rank(state)) progress.state = state;
  };
  for (const event of ordered) {
    progress.lastActivityAt = event.createdAt.toISOString();
    if (event.kind === "lesson_opened") atLeast("LEARNING");
    if (event.kind === "exercise_run") {
      atLeast("PRACTICING");
      if (event.passed) {
        progress.exercisePassed = true;
        progress.solutionOpened = false;
      }
    }
    if (event.kind === "solution_opened") {
      progress.exercisePassed = false;
      progress.solutionOpened = true;
    }
    if (event.kind === "proof" && event.label) {
      progress.lastLabel = event.label;
      if (event.passed && progress.exercisePassed && progress.state !== "PROVEN") {
        progress.state = "PROVEN";
        progress.provenAt = event.createdAt.toISOString();
        progress.reviewIntervalDays = FIRST_REVIEW_DAYS;
        progress.nextReviewAt = new Date(event.createdAt.getTime() + FIRST_REVIEW_DAYS * DAY).toISOString();
      }
    }
    if (event.kind === "review" && event.label) {
      progress.lastLabel = event.label;
      progress.reviewIntervalDays = nextIntervalDays(progress.reviewIntervalDays, event.label);
      progress.nextReviewAt = new Date(event.createdAt.getTime() + progress.reviewIntervalDays * DAY).toISOString();
    }
  }
  return progress;
}

/** Prove opens only once the exercise has passed without the solution open since. */
export function canProve(progress: TopicProgress) {
  return progress.exercisePassed;
}

export function isReviewDue(progress: TopicProgress, now: Date) {
  return progress.nextReviewAt !== null && new Date(progress.nextReviewAt) <= now;
}
