import type { TopicEventKind } from "./progress";

// A topic's status in the Claude-first Engineering module. Spec: docs/architecture/engineering-claude-first.md,
// section 2. Like the old progress, it's rebuilt from the topic's events, so it can be recomputed at any time.

export const TOPIC_STATUSES = ["not_started", "in_progress", "learned", "skipped"] as const;
export type TopicStatus = (typeof TOPIC_STATUSES)[number];

/** A status as saved on an event. Ready to check was removed; events that set it before then read as In progress. */
export type StoredTopicStatus = TopicStatus | "ready_to_check";

export function readStatus(status: StoredTopicStatus): TopicStatus;
export function readStatus(status: StoredTopicStatus | null): TopicStatus | null;
export function readStatus(status: StoredTopicStatus | null): TopicStatus | null {
  return status === "ready_to_check" ? "in_progress" : status;
}

/** Who set the current status: the owner, Claude, or the old Loots flow it was carried over from. */
export type StatusSetter = "owner" | "claude" | "ken-os";

/** What Claude may report as a status. Not started is only the owner's, to undo. */
export const CLAUDE_STATUSES = ["in_progress", "learned", "skipped"] as const;
export type ClaudeStatus = (typeof CLAUDE_STATUSES)[number];

/** Learned topics older than this are listed for Claude, so it can offer a refresh. Nothing changes on its own. */
export const STALE_LEARNED_DAYS = 60;

/** The shortest explanation that counts as evidence for Learned. A sentence, not a word. */
export const EVIDENCE_MIN_LENGTH = 40;

export interface StatusEvent {
  kind: TopicEventKind;
  /** exercise_run: every test passed. proof: every rubric line met. */
  passed: boolean | null;
  /** report and status_set: the status they set, if any. */
  status: StoredTopicStatus | null;
  source: "ken-os" | "claude";
  createdAt: Date;
}

export interface TopicStatusView {
  status: TopicStatus;
  setBy: StatusSetter | null;
  /** When the status last changed. */
  changedAt: string | null;
  /** When the topic became Learned, if it is. */
  learnedAt: string | null;
}

const OLD_ACTIVITY: readonly TopicEventKind[] = [
  "lesson_opened",
  "exercise_run",
  "solution_opened",
  "exercise_switched",
  "review",
];

/**
 * Replays a topic's events in order.
 *
 * - The old flow carries over: any old activity makes the topic In progress, and a passed proof while the exercise
 *   stood passed makes it Learned, as Proven did.
 * - A report from Claude moves Not started to In progress, and sets the status it names.
 * - The owner's status_set sets any status, including Not started to undo.
 */
export function computeTopicStatus(events: readonly StatusEvent[]): TopicStatusView {
  const view: TopicStatusView = { status: "not_started", setBy: null, changedAt: null, learnedAt: null };
  let exercisePassed = false;
  const set = (status: TopicStatus, by: StatusSetter, at: Date) => {
    if (view.status === status && view.setBy === by) return;
    view.status = status;
    view.setBy = by;
    view.changedAt = at.toISOString();
    view.learnedAt = status === "learned" ? at.toISOString() : null;
  };
  const ordered = [...events].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const event of ordered) {
    if (event.kind === "exercise_run" && event.passed) exercisePassed = true;
    if (event.kind === "solution_opened" || event.kind === "exercise_switched") exercisePassed = false;
    if (OLD_ACTIVITY.includes(event.kind) && view.status === "not_started")
      set("in_progress", "ken-os", event.createdAt);
    if (event.kind === "proof" && event.passed && exercisePassed && view.status !== "learned")
      set("learned", "ken-os", event.createdAt);
    const status = readStatus(event.status);
    if (event.kind === "report") {
      if (status) set(status, "claude", event.createdAt);
      else if (view.status === "not_started") set("in_progress", "claude", event.createdAt);
    }
    if (event.kind === "status_set" && status) set(status, "owner", event.createdAt);
  }
  return view;
}

/**
 * Whether Claude may change the status now. Claude never overrides a status the owner set, except that a fresh report
 * may start a topic the owner reset to Not started.
 */
export function claudeMayChange(current: TopicStatusView, next: ClaudeStatus): boolean {
  if (current.setBy !== "owner") return true;
  return current.status === "not_started" && next === "in_progress";
}

/** Learned topics old enough to offer a refresh, oldest first. */
export function staleLearned<T extends { learnedAt: string | null; status: TopicStatus }>(
  items: readonly T[],
  now: Date,
): T[] {
  const cutoff = now.getTime() - STALE_LEARNED_DAYS * 86_400_000;
  return items
    .filter((item) => item.status === "learned" && item.learnedAt && new Date(item.learnedAt).getTime() < cutoff)
    .sort((a, b) => a.learnedAt!.localeCompare(b.learnedAt!));
}
