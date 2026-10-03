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

const labels: Record<StepId, string> = { learn: "Learn", practice: "Practice", lab: "Lab", check: "Check" };

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
