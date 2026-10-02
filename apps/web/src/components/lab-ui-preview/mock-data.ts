// Fake data for the Engineering Lab UI direction mockups (design-preview?view=lab-ui). No database, no AI calls.
// The outline follows the handoff's section 24; topics marked written exist in content/engineering-lab today.

export type MockStatus = "proven" | "practicing" | "learning" | "not_started" | "revisit" | "known" | "untested" | "unwritten";

export interface MockTopic {
  id: string;
  title: string;
  status: MockStatus;
  /** True when the baseline or a proof says this isn't a gap. */
  known?: boolean;
}

export interface MockChapter {
  id: string;
  title: string;
  topics: MockTopic[];
}

export interface MockTrack {
  id: "fullstack" | "ai";
  title: string;
  summary: string;
  chapters: MockChapter[];
}

const unwritten = (titles: string[], prefix: string): MockTopic[] => titles.map((title, index) => ({ id: `${prefix}-${index}`, title, status: "unwritten" }));

export const tracks: MockTrack[] = [
  {
    id: "fullstack",
    title: "Full-stack",
    summary: "From the JavaScript runtime to running a service in production.",
    chapters: [
      {
        id: "m1", title: "JavaScript runtime and async", topics: [
          { id: "js.call_stack", title: "The call stack and run to completion", status: "proven", known: true },
          { id: "js.event_loop", title: "Event loop, tasks and microtasks", status: "practicing" },
          { id: "js.promises", title: "Promises and async/await ordering", status: "learning" },
          { id: "js.closures", title: "Closures and captured variables", status: "known", known: true },
          { id: "js.references_mutation", title: "References, equality and shallow copies", status: "not_started" },
          { id: "js.async_races", title: "Async request races and cancellation", status: "not_started" },
        ],
      },
      {
        id: "m2", title: "HTTP and the browser", topics: [
          { id: "web.request_lifecycle", title: "From URL to response, including HTTPS", status: "revisit" },
          { id: "web.cookies_sessions", title: "Cookies and sessions", status: "not_started" },
          { id: "web.cors", title: "CORS, and what it does not protect", status: "not_started" },
          { id: "web.http_caching", title: "Browser caching and HTTP cache headers", status: "not_started" },
        ],
      },
      {
        id: "m3", title: "Databases: transactions, concurrency and indexes", topics: [
          { id: "db.transactions", title: "Transactions and all-or-nothing writes", status: "proven", known: true },
          { id: "db.constraints", title: "Constraints as the source of truth", status: "not_started" },
          { id: "db.lost_update", title: "Lost updates", status: "not_started" },
          { id: "db.atomic_updates", title: "Atomic updates and conditional writes", status: "not_started" },
          { id: "db.indexes", title: "What an index is and when Postgres uses it", status: "not_started" },
          { id: "db.composite_indexes", title: "Composite indexes and column order", status: "not_started" },
          { id: "db.query_plans", title: "Reading query plans", status: "not_started" },
          { id: "api.idempotency_basics", title: "Idempotent create requests", status: "not_started" },
        ],
      },
      { id: "m4", title: "React and the UI", topics: [
        { id: "react.render", title: "React render model", status: "untested" },
        { id: "react.effects", title: "Effects and synchronization", status: "untested" },
        ...unwritten(["Runtime validation", "Pagination"], "m4"),
      ] },
      { id: "m5", title: "Production reliability", topics: unwritten(["Testing strategy", "Authorization depth", "XSS and web security", "Background jobs", "Retry and backoff", "Timeouts", "Partial failures", "Graceful degradation"], "m5") },
      { id: "m6", title: "Observability", topics: unwritten(["Logs", "Metrics", "Traces"], "m6") },
      { id: "m7", title: "Architecture at scale", topics: unwritten(["Caching strategy", "Scaling", "Multi-tenancy", "System evolution"], "m7") },
    ],
  },
  {
    id: "ai",
    title: "AI Engineering",
    summary: "Retrieval, structured outputs, agents and evals, built and measured.",
    chapters: [
      { id: "a1", title: "Retrieval", topics: [
        { id: "ai.semantic_search", title: "Semantic search", status: "known", known: true },
        { id: "ai.retrieval_eval", title: "Retrieval evaluation", status: "untested" },
        ...unwritten(["RAG", "Advanced RAG", "Reranking"], "a1"),
      ] },
      { id: "a2", title: "Model interfaces", topics: unwritten(["Structured outputs", "Tool calling", "Context engineering"], "a2") },
      { id: "a3", title: "Agents", topics: unwritten(["Agent patterns", "State and memory", "MCP"], "a3") },
      { id: "a4", title: "AI in production", topics: unwritten(["Evals", "AI observability", "Cost and latency", "Production reliability"], "a4") },
    ],
  },
];

export const statusText: Record<MockStatus, string> = {
  proven: "Proven",
  practicing: "Practicing",
  learning: "Learning",
  not_started: "Not started",
  revisit: "Needs another look",
  known: "Known · skip",
  untested: "Not assessed yet",
  unwritten: "Not written yet",
};

/** Gaps are anything assessment hasn't shown you know. Untested topics need a placement check first. */
export function isGap(topic: MockTopic) {
  return !topic.known && topic.status !== "unwritten";
}

export const lesson = {
  title: "Event loop, tasks and microtasks",
  outline: ["Why it matters", "What you already know", "The gap", "The theory", "Mental model", "Worked example", "Go deeper"],
  whyItMatters: "Ordering bugs look like a spinner that never clears, or a save that runs before validation finishes. They pass every test that runs one thing at a time.",
  whatYouKnow: "You know callbacks run later, and you can trace synchronous code line by line.",
  theGap: "In the baseline you predicted `A B D C`. The real order is `A D C B`: you placed the timer before the promise callback.",
  theory: [
    "JavaScript runs one piece of code at a time, to completion. Nothing interrupts it.",
    "When the call stack is empty, the runtime drains the **whole microtask queue** (promise callbacks, `queueMicrotask`).",
    "Only then does it take the **next task**, such as a `setTimeout` callback, and the cycle repeats.",
  ],
  mentalModel: "A task is a meeting. Microtasks are the follow-ups you finish before the next meeting starts, however many there are.",
  workedExample: `console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
console.log("D");`,
  walkthrough: "A and D are synchronous, so they print first. C is a microtask, so it runs as soon as the stack is empty. B waits for a new task.",
  deeper: [
    { title: "What counts as a task", body: "Timers, I/O callbacks, message events and user input each start a new task. Rendering happens between tasks, which is why a long microtask chain can freeze the page." },
    { title: "Microtasks that queue microtasks", body: "A microtask that queues another microtask runs it in the same drain. An endless chain never lets the next task, or a render, happen." },
    { title: "Real bug: the spinner that never clears", body: "A loading flag set inside `setTimeout` and cleared in a `.then` can end up cleared before it's set. The fix is to keep both on the same queue." },
  ],
};

export const practice = [
  {
    prompt: "What does this print, in order?",
    code: `setTimeout(() => console.log("timer"), 0);
queueMicrotask(() => console.log("micro"));
console.log("sync");`,
    actual: ["sync", "micro", "timer"],
    answer: ["sync", "timer", "micro"],
    why: "The timer was queued first, so it runs first.",
    explanation: "`sync` is plain code, so it prints first. The microtask runs as soon as the stack is empty, before the timer's task, even though the timer was queued earlier.",
  },
  {
    prompt: "And this one?",
    code: `Promise.resolve().then(() => {
  console.log("first");
  queueMicrotask(() => console.log("nested"));
});
setTimeout(() => console.log("later"));
console.log("now");`,
    actual: ["now", "first", "nested", "later"],
    answer: null as string[] | null,
    why: "",
    explanation: "A microtask queued during the drain runs in the same drain, so `nested` still beats the timer.",
  },
];

export const check = {
  predict: {
    prompt: "What exact lines does this print, and in what order?",
    code: `function report(label, action) {
  console.log(label + " start");
  action();
  console.log(label + " end");
}
setTimeout(() => console.log("timer"), 0);
report("outer", () => {
  report("inner", () => console.log("body"));
});
console.log("script end");`,
    actual: ["outer start", "inner start", "body", "inner end", "outer end", "script end", "timer"],
    answer: ["outer start", "body", "outer end", "script end", "timer"],
    explanation: "`report` is synchronous, so the inner call runs completely inside the outer one. Only the timer waits for a new task.",
  },
  written: {
    prompt: "Why can a promise callback run before a zero-delay timer that was scheduled earlier?",
    answer: "Promise callbacks are microtasks, and microtasks run before timers.",
    feedback: "Right that promise callbacks are microtasks. You didn't say the whole queue drains before the next task, which is the part that decides the order.",
    rubric: [
      { point: "Promise callbacks are queued as microtasks", result: "covered" as const },
      { point: "The microtask queue drains completely when the stack empties", result: "missed" as const },
      { point: "A timer callback runs as a separate, later task", result: "partly" as const },
    ],
  },
};

export const lab = {
  title: "Fix the save order",
  readme: `The form below shows "saved" before "validated". Change \`submitForm\` so validation always finishes before the save, without removing either step.

**Done when**
- \`validated\` is logged before \`saved\`
- the button is disabled for the whole submit`,
  starter: `function submitForm(log) {
  log("button disabled");
  setTimeout(() => log("validated"), 0);
  Promise.resolve().then(() => log("saved"));
  log("spinner shown");
}
`,
  tests: [
    { name: "validated runs before saved", passed: false },
    { name: "button stays disabled until saved", passed: true },
  ],
};

export interface MockTerm {
  term: string;
  meaning: string;
  source: { title: string; url: string };
  foundIn: string;
  savedAt: string;
}

export const savedTerms: MockTerm[] = [
  {
    term: "microtask",
    meaning: "A small job the runtime runs right after the current code finishes and before the next task, such as a promise callback.",
    source: { title: "MDN: Using microtasks", url: "https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide" },
    foundIn: "Event loop, tasks and microtasks · Learn",
    savedAt: "Oct 2",
  },
  {
    term: "idempotent",
    meaning: "Safe to repeat: doing it twice has the same effect as doing it once. A retried payment request should be idempotent.",
    source: { title: "MDN: Idempotent", url: "https://developer.mozilla.org/en-US/docs/Glossary/Idempotent" },
    foundIn: "Idempotent create requests · Check",
    savedAt: "Oct 1",
  },
  {
    term: "skip scan",
    meaning: "A Postgres 18 index trick that can use a multicolumn index even when the query doesn't filter on its first column.",
    source: { title: "PostgreSQL: Multicolumn indexes", url: "https://www.postgresql.org/docs/current/indexes-multicolumn.html" },
    foundIn: "Composite indexes and column order · Lab",
    savedAt: "Oct 1",
  },
];

/** Canned answers for the lookup popover. The real build asks the AI, with the selected sentence as context. */
export const lookupAnswers: Record<string, Omit<MockTerm, "foundIn" | "savedAt">> = {
  "call stack": {
    term: "call stack",
    meaning: "The list of functions currently running, newest on top. JavaScript finishes everything on it before running anything queued.",
    source: { title: "MDN: Call stack", url: "https://developer.mozilla.org/en-US/docs/Glossary/Call_stack" },
  },
  "task": {
    term: "task",
    meaning: "One unit of work the event loop picks up, such as a timer callback or a click handler. Rendering can happen between tasks.",
    source: { title: "HTML spec: Event loops", url: "https://html.spec.whatwg.org/multipage/webappapis.html#event-loops" },
  },
  "microtask": savedTerms[0],
};

export function lookup(selection: string) {
  const key = selection.trim().toLowerCase().replace(/[.,:;!?`"]+$/g, "").replace(/s$/, "");
  return lookupAnswers[key] ?? lookupAnswers[`${key}s`] ?? {
    term: selection.trim(),
    meaning: "In the real build, the AI writes a two-sentence meaning here, using the sentence you selected it from as context.",
    source: { title: "One link from the Researcher's trusted sites", url: "https://developer.mozilla.org/" },
  };
}
