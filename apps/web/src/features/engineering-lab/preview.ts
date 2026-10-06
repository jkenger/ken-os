import { areaLevel, chapterStates, computeProgress, planNext, roadmap, roleDistance, type Label } from "@ken-os/domain";
import { baselineAttempts, careers, topicMap } from "./curriculum";
import type { RunView } from "./assessment-run";
import type { DailyView } from "./daily";
import type { ProfileView } from "./profile-store";
import type { TodayView, TopicView } from "./store";
import type { EvidenceLink, EvidenceView } from "./evidence";

// Sample data for the development-only design preview. Built from the real topic map and baseline; nothing is stored.

export function previewToday(): TodayView {
  const progress = topicMap.topics.map((topic) => computeProgress(topic, baselineAttempts(), false).progress);
  return {
    plan: planNext({ map: topicMap, progress, latestLabel: {}, now: new Date() }),
    progress, reviewsDue: [], recentlyValidated: [], recentChanges: [], generationsUsed: 0, generationLimit: 20,
  };
}

const previewBaseline = { on: "2026-10-01T12:00:00Z", source: "summary" as const };

export function previewTopic(topicId: string): TopicView {
  const topic = topicMap.topics.find((item) => item.id === topicId)!;
  const progress = computeProgress(topic, baselineAttempts(), true).progress;
  const mdn = "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide";
  if (topicId !== "js.event_loop") {
    return { progress, lessonCount: 0, lesson: null, sources: [], sourceCheckedAt: null, assessment: null, attempts: [], revealedLabs: [], passedLabs: [], reviewDue: false, practiceResults: {}, baseline: previewBaseline, closedBook: false };
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
      deeper: [
        { title: "What counts as a task", body: "Timers, I/O callbacks, message events and user input each start a new task. Rendering happens between tasks, which is why a long microtask chain can freeze the page." },
        { title: "Real bug: the spinner that never clears", body: "A loading flag set inside `setTimeout` and cleared in a `.then` can end up cleared before it is set. Keep both on the same queue." },
      ],
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
    baseline: previewBaseline,
    closedBook: false,
  };
}

/**
 * A sample profile for the design preview: a finished baseline that placed a few topics, screening answers for two
 * unwritten chapters, and a chosen direction. Built with the real rules; nothing is stored.
 */
/** The sample learner behind previewProfile: a few placed topics and three screened chapters. */
export function previewLearner() {
  const placed = new Set(["js.call_stack", "js.promises", "db.transactions", "db.constraints", "db.indexes"]);
  const progress = previewToday().progress.map((item) => placed.has(item.topicId) ? { ...item, placement: "passed" as const, baselineLabel: "solid" as const } : item);
  const screens = [{ chapterId: "a2-model-interfaces", labels: ["solid", "solid"] as Label[] }, { chapterId: "a1-retrieval", labels: ["solid", "partial"] as Label[] }, { chapterId: "m4-react", labels: ["solid", "solid"] as Label[] }];
  return { progress, states: chapterStates(topicMap, progress, screens) };
}

export function previewProfile(baselineState: ProfileView["baseline"]["state"] = "done"): ProfileView {
  const { progress, states } = previewLearner();
  const before = chapterStates(topicMap, previewToday().progress, []);
  const role = careers.roles.find((item) => item.id === "fullstack-applied-ai")!;
  const steps = roadmap(role, careers, states, topicMap, progress, 6);
  return {
    careers: { status: careers.status, approvedOn: careers.approvedOn, note: careers.note, definitions: careers.definitions, levels: careers.levels, sources: careers.sources },
    baseline: { state: baselineState, runId: baselineState === "none" ? null : "preview-run", completedAt: baselineState === "done" ? "2026-10-04T12:00:00Z" : null },
    checkpoint: { inProgressRunId: null, done: [] },
    intake: { building: "My own web products", stack: "Next.js, Postgres", aiWork: "Embeddings and semantic search", weeklyHours: 6 },
    direction: baselineState === "done" ? role.id : null,
    areas: careers.areas.map((ladder) => ({ area: ladder.id, title: ladder.title, summary: ladder.summary, now: areaLevel(ladder, states), atBaseline: areaLevel(ladder, before), checkpoints: [] })),
    chapterStates: states,
    baselineChapterStates: baselineState === "done" ? before : null,
    progress,
    roles: careers.roles.map((item) => ({ ...roleDistance(item, careers, states), title: item.title, summary: item.summary })),
    roadmap: steps.map((step) => {
      const module = topicMap.modules.find((item) => item.id === step.chapter)!;
      return {
        ...step, title: module.title, planned: module.planned, added: false,
        topics: topicMap.topics.filter((topic) => topic.module === step.chapter).map((topic) => {
          const item = progress.find((entry) => entry.topicId === topic.id)!;
          return { topicId: topic.id, title: topic.title, status: item.status, known: item.placement === "passed" };
        }),
      };
    }),
    pace: { weeklyHours: 6, source: "hours", hoursPerTopic: null },
    addedChapters: [],
    conversation: [],
    radar: { week: "2026-W40", checked: true, items: [{ id: "r1", tag: "experiment", title: "Structured outputs now support streaming partial objects", reason: "Lets a form fill in as the model answers instead of after.", sourceUrl: "https://platform.openai.com/docs", topicId: null, area: "ai" }] },
  };
}

/** A sample run halfway through: one chapter done with results, the next one asking a prediction. */
export function previewRun(): RunView {
  return {
    id: "preview-run", kind: "baseline", startedAt: "2026-10-04T09:00:00Z", completedAt: null, generations: 2, allowance: 19,
    current: {
      chapterId: "m2-http-browser", type: "topic", id: "preview-set", topicId: "web.cors", itemIndex: 0, position: 1, outOf: 8,
      item: { mode: "explain", prompt: "A page on app.example calls api.example with fetch. The request reaches the server and the server logs it, but the page sees an error. What happened, and what was CORS protecting?", code: null },
    },
    chapters: topicMap.modules.map((module, index) => ({
      chapterId: module.id, title: module.title, area: module.area, kind: topicMap.topics.some((topic) => topic.module === module.id) ? "topics" as const : "screen" as const,
      status: index === 0 ? "done" as const : index === 1 ? "in_progress" as const : "not_started" as const,
      skipped: [], unwritten: 0, answered: index === 0 ? 9 : 0, stage: index === 1 ? "chapter" as const : null, cleared: false,
      topics: topicMap.topics.filter((topic) => topic.module === module.id).map((topic, position) => ({ topicId: topic.id, title: topic.title, done: index === 0, label: index === 0 ? (position % 3 === 0 ? "solid" as const : "partial" as const) : null })),
      answers: index === 0 ? [{ label: "partial" as const, voided: false, feedback: "Right that microtasks run first; missed that the whole queue drains before the timer.", prompt: "What prints?", mode: "predict", answer: "A\nD\nB\nC", rubric: null, selfRating: 4 }] : [],
    })),
  };
}

/** A sample day of practice: one answered prediction, one open explanation, and a lab fix. Nothing is stored. */
export function previewDaily(): DailyView {
  return {
    day: "2026-10-05", warmUp: false, done: false,
    items: [
      {
        type: "question", topicId: "js.call_stack", topicTitle: "The call stack and run to completion", assessmentId: "preview-a", itemIndex: 0, labId: null, labTitle: null, passedToday: false,
        item: { mode: "predict", prompt: "What does this print?", code: "console.log(1);\nsetTimeout(() => console.log(2));\nconsole.log(3);" },
        answered: { label: "solid", feedback: "Right lines, right order.", voided: false, answer: { lines: ["1", "3", "2"], text: null, why: null, actual: ["1", "3", "2"] }, explanation: "Synchronous logs run first; the timer callback waits for a new task.", rubric: null },
      },
      { type: "lab", topicId: "js.references_mutation", topicTitle: "References, equality and shallow copies", assessmentId: null, itemIndex: null, item: null, labId: "shallow-copy", labTitle: "Fix the shared settings object", answered: null, passedToday: false },
      {
        type: "question", topicId: "db.transactions", topicTitle: "Transactions and all-or-nothing writes", assessmentId: "preview-b", itemIndex: 0, labId: null, labTitle: null, passedToday: false,
        item: { mode: "explain", prompt: "An order saves its line items, then charging the card fails. What should happen to the line items, and how do you make sure it does?", code: null },
        answered: null,
      },
    ],
  };
}

/** A sample graded prediction and the recent-evidence list, for the Profile and evidence previews. */
export function previewEvidence(): { view: EvidenceView; recent: EvidenceLink[] } {
  const view: EvidenceView = {
    id: "preview-attempt", topicId: "js.event_loop", topicTitle: "Event loop, tasks and microtasks", kind: "baseline", mode: "predict", role: "placement",
    at: "2026-10-04T12:00:00Z", selfRating: 4,
    result: { label: "partial", gradedBy: "code", feedback: "Right lines, wrong order: the microtask runs before the timeout.", misconceptions: ["Timers run before promise callbacks"], rubric: null, run: null, solutionSeen: false },
    question: { prompt: "What does this print, in order?", code: "setTimeout(() => console.log(\"timeout\"));\nPromise.resolve().then(() => console.log(\"micro\"));\nconsole.log(\"sync\");", expectedOutput: ["sync", "micro", "timeout"], rubric: null, labTitle: null },
    response: { lines: ["sync", "timeout", "micro"], why: "Timers were queued first.", actual: ["sync", "micro", "timeout"] },
    source: { promptVersion: "assessor-v3", model: "preview-model", origin: "run", runId: "preview-run", runKind: "baseline" },
  };
  const recent: EvidenceLink[] = [
    { id: "preview-attempt", topicId: "js.event_loop", topicTitle: "Event loop, tasks and microtasks", kind: "baseline", label: "partial", role: "placement", at: "2026-10-04T12:00:00Z" },
    { id: "preview-2", topicId: "db.transactions", topicTitle: "Transactions", kind: "baseline", label: "solid", role: "placement", at: "2026-10-04T11:40:00Z" },
    { id: "preview-3", topicId: "js.promises", topicTitle: "Promises", kind: "baseline", label: "solid", role: "placement", at: "2026-10-04T11:20:00Z" },
  ];
  return { view, recent };
}
