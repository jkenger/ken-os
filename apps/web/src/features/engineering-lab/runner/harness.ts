// Builds the scripts the browser runs in a Web Worker. Kept as plain strings with no DOM access so the same
// harness can be exercised in Node tests. The worker is started from a data: URL, which gives it an opaque
// origin: it cannot send the owner's cookies or pass the API's origin check.

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export type WorkerMessage =
  | { type: "tests"; results: TestResult[]; logs: string[] }
  | { type: "output"; logs: string[] }
  | { type: "error"; message: string; logs: string[] };

const HARNESS = String.raw`
const __logs = [];
const __format = (value) => {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
};
const __emit = (...args) => __logs.push(args.map(__format).join(" "));
globalThis.console = { log: __emit, info: __emit, warn: __emit, error: __emit, debug: __emit };

let __unhandled = 0;
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("unhandledrejection", (event) => { __unhandled += 1; event.preventDefault(); });
}
function unhandledRejections() { return __unhandled; }

const __pendingTimers = new Set();
const __setTimeout = globalThis.setTimeout.bind(globalThis);
const __clearTimeout = globalThis.clearTimeout.bind(globalThis);
globalThis.setTimeout = (callback, delay, ...args) => {
  const id = __setTimeout(() => { __pendingTimers.delete(id); if (typeof callback === "function") callback(...args); }, delay);
  __pendingTimers.add(id);
  return id;
};
globalThis.clearTimeout = (id) => { __pendingTimers.delete(id); __clearTimeout(id); };

function wait(ms) { return new Promise((resolve) => __setTimeout(resolve, ms)); }
async function __settle(limitMs) {
  const started = Date.now();
  let quiet = 0;
  while (Date.now() - started < limitMs) {
    await wait(0);
    quiet = __pendingTimers.size === 0 ? quiet + 1 : 0;
    if (quiet >= 3) return;
  }
}

const __tests = [];
function test(name, fn) { __tests.push({ name, fn }); }
const __same = (a, b) => __format(a) === __format(b);
const assert = {
  equal(actual, expected, message) {
    if (!Object.is(actual, expected)) throw new Error(message || "Expected " + __format(expected) + ", got " + __format(actual));
  },
  deepEqual(actual, expected, message) {
    if (!__same(actual, expected)) throw new Error(message || "Expected " + __format(expected) + ", got " + __format(actual));
  },
  ok(value, message) {
    if (!value) throw new Error(message || "Expected a truthy value, got " + __format(value));
  },
  async rejects(promiseOrFn, message) {
    try { await (typeof promiseOrFn === "function" ? promiseOrFn() : promiseOrFn); }
    catch { return; }
    throw new Error(message || "Expected it to fail, but it succeeded");
  },
};
`;

function load(source: string) {
  // Indirect eval keeps learner code and tests in one scope while a syntax error is reported instead of killing the worker.
  return `try { (0, eval)(${JSON.stringify(source)}); } catch (error) { __post({ type: "error", message: String(error && error.message || error), logs: __logs }); throw error; }`;
}

const POST = `const __post = (message) => { if (typeof postMessage === "function") postMessage(message); else globalThis.__result = message; };`;

export interface LabScriptOptions {
  /** The app origin, for labs that make cross-origin requests back to the practice endpoints. */
  origin?: string;
  /** Database labs: PGlite is imported from this URL (null when a test already set globalThis.db), then setup runs. */
  pglite?: { url: string | null; setup: string };
}

/** Learner code plus the lab's tests. Each test runs in order; the worker reports every result. */
export function buildLabScript(code: string, tests: string, options: LabScriptOptions = {}) {
  const database = options.pglite
    ? `
  try {
    const url = ${JSON.stringify(options.pglite.url)};
    if (url) {
      const { PGlite } = await import(url);
      globalThis.db = new PGlite();
    }
    await globalThis.db.exec(${JSON.stringify(options.pglite.setup)});
  } catch (error) {
    __post({ type: "error", message: "The practice database could not start: " + String(error && error.message || error), logs: __logs });
    return;
  }`
    : "";
  return `${HARNESS}
${POST}
globalThis.LAB_ORIGIN = ${JSON.stringify(options.origin ?? "")};
(async () => {${database}
  try { (0, eval)(${JSON.stringify(`${code}\n;\n${tests}`)}); }
  catch (error) { __post({ type: "error", message: String(error && error.message || error), logs: __logs }); return; }
  const results = [];
  for (const { name, fn } of __tests) {
    try { await fn(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: String(error && error.message || error) }); }
  }
  __post({ type: "tests", results, logs: __logs });
})();`;
}

/** A snippet whose console output is the ground truth for a prediction. Waits for timers to finish. */
export function buildPredictScript(code: string, limitMs = 1500) {
  return `${HARNESS}
${POST}
${load(code)}
__settle(${limitMs}).then(() => __post({ type: "output", logs: __logs }));`;
}

/** An async probe body that logs its result; reports once the body settles rather than when timers go quiet. */
export function buildProbeScript(body: string, origin: string) {
  return `${HARNESS}
${POST}
const LAB_ORIGIN = ${JSON.stringify(origin)};
(async () => { ${body} })().then(
  () => __post({ type: "output", logs: __logs }),
  (error) => __post({ type: "error", message: String(error && error.message || error), logs: __logs }),
);`;
}

/** PGlite for database labs, loaded by the worker from a pinned CDN build. Keep in step with the devDependency. */
export const PGLITE_VERSION = "0.5.8";
export const PGLITE_URL = `https://cdn.jsdelivr.net/npm/@electric-sql/pglite@${PGLITE_VERSION}/dist/index.js`;
