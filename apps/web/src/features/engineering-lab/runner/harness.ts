// Builds the scripts the browser runs in a Web Worker. Kept as plain strings with no DOM access so the same
// harness can be exercised in Node tests. The worker is started from a data: URL, which gives it an opaque
// origin: it cannot send the owner's cookies or pass the API's origin check.

/** One console call made while a test or a Try it run was going. */
export interface LogLine {
  level: "log" | "warn" | "error";
  text: string;
}

/** One call a test made to a function the learner wrote, shown as code, with what came back. */
export interface CallRecord {
  call: string;
  returned?: string;
  threw?: string;
}

/** Expected against got for a failed assert.equal or assert.deepEqual, and where they first part ways. */
export interface Mismatch {
  expected: string;
  actual: string;
  /** Like `[1].qty`. Null when the values differ at the top. */
  path: string | null;
  expectedAt?: string;
  actualAt?: string;
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  console?: LogLine[];
  calls?: CallRecord[];
  /** Calls past the recorded ones, counted but not shown. */
  moreCalls?: number;
  mismatch?: Mismatch;
}

export type WorkerMessage =
  | { type: "tests"; results: TestResult[]; logs: string[] }
  | { type: "output"; logs: string[] }
  | { type: "error"; message: string; logs: string[] }
  | { type: "try"; ok: boolean; value: string; console: LogLine[] };

const HARNESS = String.raw`
const __logs = [];
const __format = (value) => {
  if (typeof value === "string") return value;
  try { return JSON.stringify(value) ?? String(value); } catch { return String(value); }
};

// Shows a value the way it would be written in code: functions as their source, objects inline when short
// and indented when long.
const __IDENT = /^[A-Za-z_$][\w$]*$/;
const __originals = new WeakMap();
const __unwrap = (value) => (typeof value === "function" && __originals.get(value)) || value;
const __clip = (text, max) => (text.length > max ? text.slice(0, max) + "…" : text);
const __indent = (text) => text.split("\n").map((line) => "  " + line).join("\n");
function __show(value, width = 60, depth = 0, seen = new Set()) {
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "function") {
    let source;
    try { source = Function.prototype.toString.call(__unwrap(value)); } catch { source = "function"; }
    source = source.replace(/\s*\n\s*/g, " ");
    if (source.length <= 60) return source;
    // Long functions show only their start: the parameters, then … for the body.
    const arrow = source.indexOf("=>");
    const brace = source.indexOf("{");
    if (arrow > 0 && (brace < 0 || arrow < brace)) return source.slice(0, arrow) + "=> …";
    return brace > 0 ? source.slice(0, brace) + "{…}" : __clip(source, 60);
  }
  if (typeof value === "bigint") return value + "n";
  if (typeof value === "symbol") return value.toString();
  if (value === undefined) return "undefined";
  if (value === null || typeof value !== "object") return Object.is(value, -0) ? "-0" : String(value);
  if (value === globalThis.db) return "db";
  if (seen.has(value)) return "[Circular]";
  if (value instanceof Date) return isNaN(value) ? "Invalid Date" : "Date(" + value.toISOString() + ")";
  if (value instanceof Error) return value.name + ": " + value.message;
  if (value instanceof RegExp) return String(value);
  if (value instanceof Promise) return "Promise {…}";
  if (depth > 6) return Array.isArray(value) ? "[…]" : "{…}";
  seen.add(value);
  const inner = (item) => __show(item, width, depth + 1, seen);
  let open, close, parts, pad = "";
  if (Array.isArray(value)) {
    open = "["; close = "]";
    parts = value.slice(0, 100).map(inner);
    if (value.length > 100) parts.push("… " + (value.length - 100) + " more");
  } else if (value instanceof Map) {
    open = "Map {"; close = "}"; pad = " ";
    parts = [...value].slice(0, 100).map(([key, item]) => inner(key) + " => " + inner(item));
  } else if (value instanceof Set) {
    open = "Set {"; close = "}"; pad = " ";
    parts = [...value].slice(0, 100).map(inner);
  } else {
    const proto = Object.getPrototypeOf(value);
    const name = proto && proto !== Object.prototype && proto.constructor && proto.constructor.name !== "Object" && proto.constructor.name;
    open = (name ? name + " " : "") + "{"; close = "}"; pad = " ";
    const keys = Object.keys(value);
    parts = keys.slice(0, 50).map((key) => (__IDENT.test(key) ? key : JSON.stringify(key)) + ": " + inner(value[key]));
    if (keys.length > 50) parts.push("… " + (keys.length - 50) + " more");
  }
  seen.delete(value);
  if (!parts.length) return open + close;
  const flat = open + pad + parts.join(", ") + pad + close;
  if (flat.length <= width && !flat.includes("\n")) return flat;
  return open + "\n" + parts.map(__indent).join(",\n") + "\n" + close;
}
const __text = (value) => __clip(__show(value), 4000);
const __line = (value) => __clip(__show(value, Infinity), 300);
const __errorText = (error) => (error instanceof Error ? error.name + ": " + error.message : "Thrown: " + __line(error));

// While a test runs, console output and calls to the learner's functions are kept with that test.
let __current = null;
const __emit = (level) => (...args) => {
  if (!__current) { __logs.push(args.map(__format).join(" ")); return; }
  if (__current.console.length < 200) __current.console.push({ level, text: __clip(args.map((arg) => (typeof arg === "string" ? arg : __text(arg))).join(" "), 4000) });
};
globalThis.console = { log: __emit("log"), info: __emit("log"), warn: __emit("warn"), error: __emit("error"), debug: __emit("log") };

function __track(name, value) {
  if (typeof value !== "function") return value;
  const record = (prefix, args, run) => {
    const test = __current;
    if (!test) return run();
    let entry = null;
    if (test.calls.length < 20) test.calls.push((entry = { call: prefix + name + "(" + args.map(__line).join(", ") + ")" }));
    else test.moreCalls += 1;
    let result;
    try { result = run(); }
    catch (error) { if (entry) entry.threw = __errorText(error); throw error; }
    if (entry && result instanceof Promise)
      result.then((resolved) => { entry.returned = __line(resolved); }, (error) => { entry.threw = __errorText(error); });
    else if (entry) entry.returned = __line(result);
    return result;
  };
  const proxy = new Proxy(value, {
    apply: (target, self, args) => record("", args, () => Reflect.apply(target, self, args)),
    construct: (target, args, newTarget) => record("new ", args, () => Reflect.construct(target, args, newTarget)),
  });
  __originals.set(proxy, value);
  return proxy;
}

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

// The first place two values part ways, as a path like [1].qty. Null when nothing below the top differs.
const __MISSING = { missing: true };
const __plain = (value) => Array.isArray(value) || (value && typeof value === "object" && [Object.prototype, null].includes(Object.getPrototypeOf(value)));
function __firstDifference(actual, expected, path) {
  if (Object.is(actual, expected)) return null;
  if (!__plain(actual) || !__plain(expected) || Array.isArray(actual) !== Array.isArray(expected))
    return __show(actual, Infinity) === __show(expected, Infinity) ? null : { path, actual, expected };
  const keys = Array.isArray(actual)
    ? Array.from({ length: Math.max(actual.length, expected.length) }, (_, index) => index)
    : [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
  for (const key of keys) {
    const next = path + (typeof key === "number" ? "[" + key + "]" : __IDENT.test(key) ? "." + key : "[" + JSON.stringify(key) + "]");
    const a = Object.prototype.hasOwnProperty.call(actual, key) ? actual[key] : __MISSING;
    const e = Object.prototype.hasOwnProperty.call(expected, key) ? expected[key] : __MISSING;
    if (a === __MISSING || e === __MISSING) return { path: next, actual: a, expected: e };
    const found = __firstDifference(a, e, next);
    if (found) return found;
  }
  return null;
}
const __at = (value) => (value === __MISSING ? "missing" : __line(value));
function __mismatch(actual, expected, message) {
  const error = new Error(message || "Expected " + __line(expected) + ", got " + __line(actual));
  const mismatch = { expected: __text(expected), actual: __text(actual), path: null };
  const found = __firstDifference(actual, expected, "");
  if (found && found.path) Object.assign(mismatch, { path: found.path.replace(/^\./, ""), expectedAt: __at(found.expected), actualAt: __at(found.actual) });
  error.__mismatch = mismatch;
  return error;
}

const assert = {
  equal(actual, expected, message) {
    if (!Object.is(__unwrap(actual), __unwrap(expected))) throw __mismatch(actual, expected, message);
  },
  deepEqual(actual, expected, message) {
    if (!__same(actual, expected)) throw __mismatch(actual, expected, message);
  },
  ok(value, message) {
    if (!value) throw new Error(message || "Expected a truthy value, got " + __line(value));
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

const NAME = "[A-Za-z_$][\\w$]*";
/** Top-level functions and classes, written at the start of a line. */
const FUNCTIONS = new RegExp(
  `^(?:async\\s+)?function\\s*\\*?\\s*(${NAME})|^class\\s+(${NAME})|^const\\s+(${NAME})\\s*=\\s*(?:async\\s+)?(?:function\\b|\\([^)]*\\)\\s*=>|${NAME}\\s*=>)`,
  "gm",
);
const DECLARED = new RegExp(`^\\s*(?:(?:async\\s+)?function\\s*\\*?|class|const|let|var)\\s+(${NAME})`, "gm");

function learnerFunctions(code: string, tests: string) {
  const taken = new Set([...tests.matchAll(DECLARED)].map((match) => match[1]));
  const names = [...code.matchAll(FUNCTIONS)].map((match) => match[1] ?? match[2] ?? match[3]);
  return [...new Set(names)].filter((name) => !name.startsWith("__") && !taken.has(name));
}

/**
 * The learner's code, then the tests in a block where each of the learner's functions is shadowed by a recording
 * copy. Variables stay shared: only names declared as functions or classes are shadowed.
 */
function withRecordedCalls(code: string, tests: string) {
  const names = learnerFunctions(code, tests);
  const capture = names.map(
    (name, index) => `const __fn${index} = (() => { try { return ${name}; } catch { return undefined; } })();`,
  );
  const shadow = names.map((name, index) => `const ${name} = __track(${JSON.stringify(name)}, __fn${index});`);
  return `${code}\n;\n${capture.join("\n")}\n{\n${shadow.join("\n")}\n${tests}\n}`;
}

export interface LabScriptOptions {
  /** The app origin, for labs that make cross-origin requests back to the practice endpoints. */
  origin?: string;
  /** Database labs: PGlite is imported from this URL (null when a test already set globalThis.db), then setup runs. */
  pglite?: { url: string | null; setup: string };
}

function prelude(options: LabScriptOptions, fail: string) {
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
    ${fail.replace("MESSAGE", () => `"The practice database could not start: " + String(error && error.message || error)`)}
    return;
  }`
    : "";
  return `${HARNESS}
${POST}
globalThis.LAB_ORIGIN = ${JSON.stringify(options.origin ?? "")};
(async () => {${database}`;
}

/** Learner code plus the lab's tests. Each test runs in order; the worker reports every result. */
export function buildLabScript(code: string, tests: string, options: LabScriptOptions = {}) {
  return `${prelude(options, `__post({ type: "error", message: MESSAGE, logs: __logs });`)}
  try { (0, eval)(${JSON.stringify(withRecordedCalls(code, tests))}); }
  catch (error) { __post({ type: "error", message: String(error && error.message || error), logs: __logs }); return; }
  const results = [];
  for (const { name, fn } of __tests) {
    const run = (__current = { console: [], calls: [], moreCalls: 0 });
    let outcome;
    try { await fn(); outcome = { name, passed: true }; }
    catch (error) {
      outcome = { name, passed: false, error: String(error && error.message || error) };
      if (error && error.__mismatch) outcome.mismatch = error.__mismatch;
    }
    __current = null;
    if (run.console.length) outcome.console = run.console;
    if (!outcome.passed && run.calls.length) outcome.calls = run.calls;
    if (!outcome.passed && run.moreCalls) outcome.moreCalls = run.moreCalls;
    results.push(outcome);
  }
  __post({ type: "tests", results, logs: __logs });
})();`;
}

/**
 * Try it: the learner's code and the tests' helpers (the tests register but never run), then one expression or a
 * few statements of their own. Reports what came back and what was logged.
 */
export function buildTryScript(code: string, tests: string, input: string, options: LabScriptOptions = {}) {
  return `${prelude(options, `__post({ type: "try", ok: false, value: MESSAGE, console: [] });`)}
  // Like a console: the value of an expression, or of the last statement when it is one, else the lines as written.
  const input = ${JSON.stringify(input)};
  const parses = (body) => { try { new Function("return async () => " + body); return true; } catch { return false; } };
  const trimmed = input.trim().replace(/;+$/, "");
  const lines = trimmed.split("\\n");
  let start = lines.length - 1;
  while (start > 0 && (/^[\\s)\\]}]/.test(lines[start]) || !lines[start].trim())) start -= 1;
  const last = "{\\n" + lines.slice(0, start).join("\\n") + "\\nreturn (\\n" + lines.slice(start).join("\\n") + "\\n);\\n}";
  const body = [("(\\n" + trimmed + "\\n)"), last].find(parses) ?? "{\\n" + input + "\\n}";
  const run = (__current = { console: [], calls: [], moreCalls: 0 });
  try {
    const call = (0, eval)(${JSON.stringify(`${code}\n;\n${tests}`)} + "\\n;\\n(async () => " + body + ")");
    const value = await call();
    __post({ type: "try", ok: true, value: __text(value), console: run.console });
  } catch (error) {
    __post({ type: "try", ok: false, value: __errorText(error), console: run.console });
  }
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
