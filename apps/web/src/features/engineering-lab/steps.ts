import type { Status } from "@ken-os/domain";

// The four steps of a topic page and which one to suggest. Plain code so the topic page and Today agree,
// and so it can be tested without a browser. Steps never lock: proof rules decide what counts.

export type StepId = "learn" | "practice" | "lab" | "check";

export interface StepState {
  id: StepId;
  label: string;
  /** One short line of state, such as "1 of 2 right". */
  detail: string;
  done: boolean;
}

export interface StepInput {
  status: Status;
  reviewDue: boolean;
  hasLesson: boolean;
  /** The baseline already rated this topic solid, so the lesson is optional. */
  skipLesson: boolean;
  practice: { predicts: number; solid: number };
  labs: { total: number; passed: number };
  /** Null when the topic is proven by labs alone and has no Check step. */
  check: null | { total: number; answered: number; solid: number };
}

// Labels renamed 2026-10-06 so "Learn" and "Practice" only name Engineering tabs. Ids stay, so ?step= links keep working.
const labels: Record<StepId, string> = { learn: "Lesson", practice: "Predict", lab: "Lab", check: "Prove" };

export function topicSteps(input: StepInput): { steps: StepState[]; suggested: StepId } {
  const steps: StepState[] = [];

  steps.push({
    id: "learn",
    label: labels.learn,
    detail: input.hasLesson ? "Lesson ready" : input.skipLesson ? "Optional: baseline rated it solid" : "Not written yet",
    done: input.hasLesson || input.skipLesson,
  });

  const { predicts, solid } = input.practice;
  steps.push({
    id: "practice",
    label: labels.practice,
    detail: !input.hasLesson ? "Comes with the lesson" : predicts ? `${solid} of ${predicts} right` : "Questions to think through",
    done: input.skipLesson || (input.hasLesson && solid >= predicts),
  });

  if (input.labs.total) {
    steps.push({
      id: "lab",
      label: labels.lab,
      detail: `${input.labs.passed} of ${input.labs.total} passed`,
      done: input.labs.passed >= input.labs.total,
    });
  }

  if (input.check) {
    const { total, answered, solid: right } = input.check;
    steps.push({
      id: "check",
      label: labels.check,
      detail: !total ? "No questions yet" : answered < total ? `${answered} of ${total} answered` : `${right} of ${total} solid`,
      done: total > 0 && answered === total && right === total,
    });
  }

  const has = (id: StepId) => steps.some((step) => step.id === id);
  const finalStep: StepId = has("check") ? "check" : has("lab") ? "lab" : "practice";
  let suggested: StepId;
  if (input.status === "NEEDS_REVISIT" || input.reviewDue) suggested = finalStep;
  else if (input.status === "VALIDATED") suggested = finalStep;
  else suggested = steps.find((step) => !step.done)?.id ?? finalStep;
  return { steps, suggested };
}

/** "Step 2 of 4" for the step a learner should do next. */
export function stepPosition(steps: StepState[], id: StepId) {
  return { number: steps.findIndex((step) => step.id === id) + 1, total: steps.length };
}

/** The step input for a topic, from the same data the topic page shows. Shared by the topic page and Today. */
export function stepsForTopic(view: StepView, labs: { id: string; modes: readonly string[] }[], prove: readonly string[], skipLesson: boolean) {
  const { lesson, assessment } = view;
  const assessorWrites = prove.some((mode) => !labs.some((lab) => lab.modes.includes(mode)));
  const answered = assessment?.items.filter((item) => item.answered && !item.answered.voided) ?? [];
  return topicSteps({
    status: view.progress.status,
    reviewDue: view.reviewDue,
    hasLesson: Boolean(lesson),
    skipLesson,
    practice: {
      predicts: lesson?.practice.filter((item) => item.kind === "predict").length ?? 0,
      solid: lesson?.practice.filter((item, index) => item.kind === "predict" && view.practiceResults[index]?.label === "solid").length ?? 0,
    },
    labs: { total: labs.length, passed: labs.filter((lab) => view.passedLabs.includes(lab.id)).length },
    check: assessorWrites ? {
      total: assessment?.items.length ?? 0,
      answered: assessment?.items.filter((item) => item.answered).length ?? 0,
      solid: answered.filter((item) => item.answered!.label === "solid").length,
    } : null,
  });
}

/** The parts of a topic view that decide its steps. */
export interface StepView {
  progress: { status: Status };
  reviewDue: boolean;
  lesson: { practice: { kind: string }[] } | null;
  practiceResults: Record<number, { label: string } | undefined>;
  passedLabs: string[];
  assessment: { items: { answered: null | { label: string; voided: boolean } }[] } | null;
}

/** The step Today points at for the planned topic, worked out the same way as on the topic page. */
export interface NextStep {
  steps: StepState[];
  suggested: StepId;
  place: { track: string; chapterNumber: number; chapterTitle: string };
}
