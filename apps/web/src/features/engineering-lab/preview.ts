import { computeProgress, planNext } from "@ken-os/domain";
import { baselineAttempts, topicMap } from "./curriculum";
import type { TodayView, TopicView } from "./store";

// Sample data for the development-only design preview. Built from the real topic map and baseline; nothing is stored.

export function previewToday(): TodayView {
  const progress = topicMap.topics.map((topic) => computeProgress(topic, baselineAttempts(), false).progress);
  return {
    plan: planNext({ map: topicMap, progress, latestLabel: {}, now: new Date() }),
    progress, reviewsDue: [], recentlyValidated: [], recentChanges: [], generationsUsed: 0, generationLimit: 20,
  };
}

export function previewTopic(topicId: string): TopicView {
  const topic = topicMap.topics.find((item) => item.id === topicId)!;
  const progress = computeProgress(topic, baselineAttempts(), true).progress;
  const mdn = "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide";
  if (topicId !== "js.event_loop") {
    return { progress, lessonCount: 0, lesson: null, sources: [], sourceCheckedAt: null, assessment: null, attempts: [], revealedLabs: [], passedLabs: [], reviewDue: false, practiceResults: {} };
  }
  return {
    progress,
    lessonCount: 1,
    lesson: {
      id: "preview-lesson", createdAt: new Date().toISOString(), topicId, version: 1, sourcePacketId: "preview", promptVersion: "preview", model: "preview", labIds: [], rejected: [],
      sections: {
        whyItMatters: "Ordering bugs show up as a spinner that never clears or a save that runs before validation.",
        whatYouKnow: "You know callbacks run **later**. The baseline shows you don't yet know *which* later.",
        theGap: "You predicted `A B D C`. The real order is `A D C B`.",
        theory: "- Synchronous code runs to completion first.\n- Then the **whole** microtask queue drains.\n- Then the next task, such as a `setTimeout` callback, runs.",
        mentalModel: "A task is a meeting; microtasks are the follow-ups you finish before the next meeting starts.",
        workedExample: { code: "console.log(\"A\");\nsetTimeout(() => console.log(\"B\"), 0);\nPromise.resolve().then(() => console.log(\"C\"));\nconsole.log(\"D\");", walkthrough: "A and D are synchronous. C is a microtask. B waits for a new task." },
      },
      practice: [
        { kind: "predict", prompt: "What does this print?", code: "setTimeout(() => console.log(1));\nqueueMicrotask(() => console.log(2));\nconsole.log(3);", expectedOutput: ["3", "2", "1"], explanation: "`3` is synchronous, so it prints first. `queueMicrotask` runs as soon as the stack is empty, before the timer's task." },
        { kind: "think", prompt: "Why can a long synchronous loop freeze a page?", answer: "Nothing else, including rendering, runs until the stack is empty." },
      ],
      citations: [{ claim: "Microtasks drain before the next task.", sourceUrl: mdn }],
      noteSuggestions: ["Event loop", "Microtask queue"],
    },
    sources: [{ title: "Using microtasks in JavaScript with queueMicrotask()", url: mdn, tier: "official_docs", retrievedAt: "2026-10-01", whyItMatters: "Contrasts tasks and microtasks." }],
    sourceCheckedAt: "2026-10-01",
    assessment: {
      id: "preview-assessment", kind: "assessment", createdAt: new Date().toISOString(),
      items: [
        { mode: "predict", prompt: "What does this print, in order?", code: "Promise.resolve().then(() => console.log(\"x\"));\nsetTimeout(() => console.log(\"y\"));\nconsole.log(\"z\");", answered: null },
        { mode: "explain", prompt: "Explain why a promise callback runs before a zero-delay timer.", code: null, answered: { label: "partial", feedback: "Right that promises are microtasks; you didn't say the queue drains fully before the next task.", voided: false, answer: { lines: null, text: "Promises are microtasks, so they run before timers.", why: null, actual: null }, explanation: null, rubric: [
          { point: "Promise callbacks are queued as microtasks", result: "covered" },
          { point: "The microtask queue drains completely when the stack empties", result: "missed" },
          { point: "A timer callback runs as a separate, later task", result: "partly" },
        ] } },
        { mode: "predict", prompt: "What exact lines does this print, and in what order?", code: "function report(label, action) {\n  console.log(label + \" start\");\n  action();\n  console.log(label + \" end\");\n}\nsetTimeout(() => console.log(\"timer\"), 0);\nreport(\"outer\", () => {\n  report(\"inner\", () => console.log(\"body\"));\n});\nconsole.log(\"script end\");", answered: {
          label: "partial", feedback: "The code printed outer start, inner start, body, inner end, outer end, script end, timer. You predicted outer start, body, outer end, script end, timer.", voided: false, rubric: null,
          answer: { lines: ["outer start", "body", "outer end", "script end", "timer"], text: null, why: null, actual: ["outer start", "inner start", "body", "inner end", "outer end", "script end", "timer"] },
          explanation: "`report` is synchronous, so the inner call runs completely inside the outer one. Only the timer waits for a new task.",
        } },
      ],
    },
    attempts: [],
    revealedLabs: [],
    passedLabs: [],
    reviewDue: false,
    practiceResults: { 0: { label: "partial", feedback: "The code printed 3, 2, 1. You predicted 3, 1.", voided: false, answer: { lines: ["3", "1"], text: null, why: "The timer was queued first, so it runs first.", actual: ["3", "2", "1"] } } },
  };
}
