import type { Topic } from "./topics";
import type { AttemptRecord, Label, Mode, Status } from "./types";

/** Days until the next review after each passed stage. Fixed on purpose; see the v0 proposal, section 4. */
export const REVIEW_GAPS_DAYS = [3, 10, 30, 90] as const;

export interface ModeEvidence {
  label: Label;
  attemptId: string;
  at: string;
  by: AttemptRecord["gradedBy"];
}

export interface TopicProgress {
  topicId: string;
  status: Status;
  evidence: Partial<Record<Mode, ModeEvidence>>;
  baselineLabel: Label | null;
  confidence: { averageSelfRating: number | null; overconfident: boolean };
  weaknesses: string[];
  lastAttemptAt: string | null;
  validatedAt: string | null;
  reviewStage: number;
  nextReviewAt: string | null;
}

export interface ProgressChange {
  topicId: string;
  from: Status;
  to: Status;
  attemptId: string | null;
  at: string;
  reason: string;
}

const DAY = 24 * 60 * 60 * 1000;

/** Only these attempts can prove a topic. Lesson practice and labs run after seeing the solution cannot. */
export function countsAsProof(attempt: AttemptRecord) {
  if (attempt.voided) return false;
  if (attempt.kind === "assessment" || attempt.kind === "review") return true;
  return attempt.kind === "lab" && !attempt.solutionSeen;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY);
}

/**
 * Rebuilds one topic's progress by replaying its attempts in order. Opening or reading a lesson never
 * changes status beyond NOT_STARTED to LEARNING, and only graded attempts can move it further.
 */
export function computeProgress(topic: Topic, attempts: AttemptRecord[], lessonStarted: boolean): { progress: TopicProgress; changes: ProgressChange[] } {
  const ordered = attempts.filter((attempt) => attempt.topicId === topic.id).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const changes: ProgressChange[] = [];
  const latestProof = new Map<Mode, AttemptRecord>();
  const latestAny = new Map<Mode, AttemptRecord>();
  let status = "NOT_STARTED" as Status;
  let validatedAt: Date | null = null;
  let reviewStage = 0;
  let nextReviewAt: Date | null = null;
  let baselineLabel: Label | null = null;
  let lastAttemptAt: Date | null = null;

  const move = (to: Status, attempt: AttemptRecord | null, reason: string, at: Date) => {
    if (to === status) return;
    changes.push({ topicId: topic.id, from: status, to, attemptId: attempt?.id ?? null, at: at.toISOString(), reason });
    status = to;
  };

  for (const attempt of ordered) {
    if (attempt.kind === "baseline") {
      baselineLabel = attempt.label;
      continue;
    }
    if (attempt.voided) continue;
    lastAttemptAt = attempt.createdAt;
    latestAny.set(attempt.mode, attempt);
    const proof = countsAsProof(attempt);
    if (proof) latestProof.set(attempt.mode, attempt);

    const allSolid = topic.prove.every((mode) => latestProof.get(mode)?.label === "solid");
    const someByCode = topic.prove.some((mode) => latestProof.get(mode)?.gradedBy === "code");

    if (status === "VALIDATED" && proof && attempt.label !== "solid") {
      move("NEEDS_REVISIT", attempt, `${attempt.kind} answer in ${attempt.mode} was ${attempt.label}`, attempt.createdAt);
      reviewStage = 0;
      nextReviewAt = null;
    } else if (status !== "VALIDATED" && allSolid && someByCode) {
      move("VALIDATED", attempt, `every required mode (${topic.prove.join(", ")}) is solid, with at least one checked by code`, attempt.createdAt);
      validatedAt = attempt.createdAt;
      reviewStage = 0;
      nextReviewAt = addDays(attempt.createdAt, REVIEW_GAPS_DAYS[0]);
    } else if (status === "VALIDATED") {
      if (attempt.kind === "review" && attempt.label === "solid" && nextReviewAt && attempt.createdAt >= nextReviewAt) {
        reviewStage = Math.min(reviewStage + 1, REVIEW_GAPS_DAYS.length - 1);
        nextReviewAt = addDays(attempt.createdAt, REVIEW_GAPS_DAYS[reviewStage]);
      }
    } else if (status !== "NEEDS_REVISIT") {
      const struggling = attempt.label === "gap" || attempt.label === "misconception";
      move(struggling ? "LEARNING" : "PRACTICING", attempt, `latest ${attempt.mode} answer was ${attempt.label}`, attempt.createdAt);
    }
  }
  if (status === "NOT_STARTED" && lessonStarted) {
    changes.push({ topicId: topic.id, from: status, to: "LEARNING", attemptId: null, at: new Date().toISOString(), reason: "lesson started" });
    status = "LEARNING";
  }

  const evidence: TopicProgress["evidence"] = {};
  for (const [mode, attempt] of latestAny) {
    const shown = latestProof.get(mode) ?? attempt;
    evidence[mode] = { label: shown.label, attemptId: shown.id, at: shown.createdAt.toISOString(), by: shown.gradedBy };
  }

  // A misconception stays open until a later solid answer in the same mode.
  const weaknesses: string[] = [];
  const lastSolid = new Map<Mode, number>();
  for (const attempt of ordered) if (!attempt.voided && attempt.label === "solid") lastSolid.set(attempt.mode, attempt.createdAt.getTime());
  for (const attempt of ordered) {
    if (attempt.voided || attempt.createdAt.getTime() <= (lastSolid.get(attempt.mode) ?? -1)) continue;
    for (const item of attempt.misconceptions) if (!weaknesses.includes(item)) weaknesses.push(item);
  }

  const rated = ordered.filter((attempt) => !attempt.voided && attempt.selfRating !== null);
  const averageSelfRating = rated.length ? Math.round((rated.reduce((sum, attempt) => sum + attempt.selfRating!, 0) / rated.length) * 10) / 10 : null;
  const overconfident = rated.slice(-5).some((attempt) => attempt.selfRating! >= 4 && attempt.label === "misconception");

  return {
    progress: {
      topicId: topic.id,
      status,
      evidence,
      baselineLabel,
      confidence: { averageSelfRating, overconfident },
      weaknesses: weaknesses.slice(-6),
      lastAttemptAt: lastAttemptAt?.toISOString() ?? null,
      validatedAt: validatedAt?.toISOString() ?? null,
      reviewStage,
      nextReviewAt: nextReviewAt?.toISOString() ?? null,
    },
    changes,
  };
}
