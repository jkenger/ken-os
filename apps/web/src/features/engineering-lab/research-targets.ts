import { SOURCE_DOMAINS, type ResearchTarget } from "@ken-os/domain";

// Provisional: Module 1 skills only, until the skill graph schema is approved.
// Each gap comes from the 2026-10-01 baseline in docs/product/ai-engineering-learning-handoff.md.
export const RESEARCH_TARGETS: ResearchTarget[] = [
  {
    skillId: "js.event_loop",
    title: "Event loop, tasks and microtasks",
    gap: "Predicted A B D C for sync logs, setTimeout(..., 0) and Promise.resolve().then(...). Believes code runs top to bottom with timers and promises as generic 'async'. Needs: call stack, synchronous code first, then the whole microtask queue, then the next task; where setTimeout, promise callbacks and queueMicrotask land.",
    freshness: "web_platform",
    allowedDomains: SOURCE_DOMAINS.javascript,
  },
  {
    skillId: "js.closures",
    title: "Closures and captured variables",
    gap: "Cannot explain closures; thinks captured state exists only after the function is invoked. Needs: lexical environment captured at creation, closure lifetime, let vs var in loops, and how this produces stale values in callbacks.",
    freshness: "core_concept",
    allowedDomains: SOURCE_DOMAINS.javascript,
  },
  {
    skillId: "js.references_mutation",
    title: "References, equality and shallow copies",
    gap: "Predicted nested objects become different after object spread and said objects cannot be compared with ===. Needs: reference vs value, === on objects compares identity, spread copies one level so nested references stay shared, structuredClone for deep copies.",
    freshness: "core_concept",
    allowedDomains: SOURCE_DOMAINS.javascript,
  },
  {
    skillId: "js.promises",
    title: "Promises and async/await ordering",
    gap: "No reliable model of when promise callbacks and code after await run. Needs: promise states, then callbacks as microtasks, await as a suspension point that resumes in a microtask, error propagation and unhandled rejections.",
    freshness: "web_platform",
    allowedDomains: SOURCE_DOMAINS.javascript,
  },
  {
    skillId: "js.async_races",
    title: "Async request races and cancellation",
    gap: "Thought useCallback would fix an out-of-order search response. Needs: why responses can arrive out of order, ignoring stale responses, AbortController cancellation, debouncing, and timeouts with AbortSignal.timeout.",
    freshness: "web_platform",
    allowedDomains: [...SOURCE_DOMAINS.javascript, ...SOURCE_DOMAINS.react],
  },
];

export function findResearchTarget(skillId: string) {
  return RESEARCH_TARGETS.find((target) => target.skillId === skillId);
}
