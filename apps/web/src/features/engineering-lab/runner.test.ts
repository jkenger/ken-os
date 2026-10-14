import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { PGlite } from "@electric-sql/pglite";
import { scoreProbe } from "@ken-os/domain";
import { labs } from "./generated/curriculum.generated";
import { labSolutions } from "./generated/lab-solutions.generated";
import {
  buildLabScript,
  buildPredictScript,
  buildTryScript,
  type TestResult,
  type WorkerMessage,
} from "./runner/harness";
import { workedExamples } from "./runner/examples";

// Node stand-in for the browser worker. Only for repo-authored code in tests; vm is not a security boundary.
async function run(script: string, timeoutMs = 3000, db?: PGlite): Promise<WorkerMessage> {
  const context = vm.createContext({ setTimeout, clearTimeout, AbortController, DOMException, EventTarget, Event, db });
  try {
    vm.runInContext(script, context);
  } catch {
    /* reported through __result */
  }
  const started = Date.now();
  while (!context.__result) {
    if (Date.now() - started > timeoutMs) throw new Error("script did not finish");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  // Copy out of the other realm, as postMessage would.
  return JSON.parse(JSON.stringify(context.__result)) as WorkerMessage;
}

for (const lab of labs.filter((item) => item.runner === "browser")) {
  test(`${lab.id}: the starter fails at least one test`, async () => {
    const result = await run(buildLabScript(lab.starter, lab.tests));
    assert.equal(result.type, "tests");
    if (result.type === "tests")
      assert.ok(
        result.results.some((item) => !item.passed),
        "the starter should not already pass",
      );
  });

  test(`${lab.id}: the solution passes every test`, async () => {
    const result = await run(buildLabScript(labSolutions[lab.id], lab.tests));
    assert.equal(result.type, "tests");
    if (result.type === "tests") {
      assert.ok(result.results.length > 0);
      assert.deepEqual(
        result.results.filter((item) => !item.passed),
        [],
      );
    }
  });
}

// Database labs run against real PGlite; the browser imports it from a CDN, these tests use the installed copy.
for (const lab of labs.filter((item) => item.runner === "pglite")) {
  const runDb = async (code: string) => {
    const db = new PGlite();
    try {
      return await run(buildLabScript(code, lab.tests, { pglite: { url: null, setup: lab.setup } }), 30_000, db);
    } finally {
      await db.close();
    }
  };

  test(`${lab.id}: the starter fails at least one test`, async () => {
    const result = await runDb(lab.starter);
    assert.equal(result.type, "tests", JSON.stringify(result));
    if (result.type === "tests")
      assert.ok(
        result.results.some((item) => !item.passed),
        "the starter should not already pass",
      );
  });

  test(`${lab.id}: the solution passes every test`, async () => {
    const result = await runDb(labSolutions[lab.id]);
    assert.equal(result.type, "tests", JSON.stringify(result));
    if (result.type === "tests") {
      assert.ok(result.results.length > 0);
      assert.deepEqual(
        result.results.filter((item) => !item.passed),
        [],
      );
    }
  });
}

for (const lab of labs.filter((item) => item.runner !== "probe")) {
  test(`${lab.id}: every example in the task matches what the solution returns`, async () => {
    const examples = workedExamples(lab.readme);
    assert.ok(examples.length > 0, "the task shows at least one example");
    for (const { input, expected } of examples) {
      const db = lab.runner === "pglite" ? new PGlite() : undefined;
      const options = db ? { pglite: { url: null, setup: lab.setup } } : {};
      try {
        const result = await run(buildTryScript(labSolutions[lab.id], lab.tests, input, options), 30_000, db);
        const squash = (text: string) => text.replace(/\s+/g, "");
        assert.ok(result.type === "try" && result.ok, `${input}\nthrew ${JSON.stringify(result)}`);
        assert.equal(squash(result.value), squash(expected), input);
      } finally {
        await db?.close();
      }
    }
  });
}

test("every probe lab names a built-in probe and has answerable questions", () => {
  for (const lab of labs.filter((item) => item.runner === "probe")) {
    assert.ok(["request-anatomy", "cookie-rules", "cache-rules", "cors-rules"].includes(lab.probe!.id), lab.id);
    assert.ok(lab.probe!.questions.every((question) => question.options.length >= 2 && question.why.length > 20));
  }
});

test("probe scoring compares predictions with observations", () => {
  const questions = [
    { id: "a", prompt: "A?", options: ["yes", "no"], why: "Because." },
    { id: "b", prompt: "B?", options: ["yes", "no"], why: "Because." },
  ];
  const score = scoreProbe(questions, { a: "yes", b: "yes" }, { a: "yes", b: "no" });
  assert.equal(score.passed, 1);
  assert.equal(score.failed, 1);
  assert.match(score.results[1].error!, /Actually: no/);
});

test("predict scripts capture real event-loop order", async () => {
  const result = await run(
    buildPredictScript(`
    console.log("A");
    setTimeout(() => console.log("B"), 0);
    Promise.resolve().then(() => console.log("C"));
    console.log("D");
  `),
  );
  assert.deepEqual(result, { type: "output", logs: ["A", "D", "C", "B"] });
});

test("a syntax error is reported instead of hanging", async () => {
  const result = await run(buildLabScript("function broken( {", "test('x', () => {});"));
  assert.equal(result.type, "error");
});

test("lab code and tests share one scope, including let and const", async () => {
  const result = await run(
    buildLabScript(
      "const double = (n) => n * 2; let seed = 1;",
      "test('scope', () => { assert.equal(double(seed), 2); });",
    ),
  );
  assert.deepEqual(result.type === "tests" && result.results, [{ name: "scope", passed: true }]);
});

const only = (result: WorkerMessage): TestResult => {
  assert.equal(result.type, "tests", JSON.stringify(result));
  if (result.type !== "tests") throw new Error("no tests ran");
  return result.results[0];
};

const finalState = `function getFinalState(baseState, queue) {
  console.log("queue", queue);
  return queue[queue.length - 1];
}`;

test("console output shows under the test that ran it, functions as source and objects pretty", async () => {
  const result = await run(
    buildLabScript(
      `${finalState}\nfunction show(value) { console.warn(value); console.error("long", { items: ["a".repeat(30), "b".repeat(30)] }); }`,
      `test("first", () => { getFinalState(0, [5, (n) => n + 1]); });
       test("second", () => { show({ id: 1 }); });`,
    ),
  );
  assert.equal(result.type, "tests");
  if (result.type !== "tests") return;
  assert.deepEqual(result.results[0].console, [{ level: "log", text: "queue [5, (n) => n + 1]" }]);
  assert.deepEqual(result.results[1].console, [
    { level: "warn", text: "{ id: 1 }" },
    { level: "error", text: `long {\n  items: [\n    "${"a".repeat(30)}",\n    "${"b".repeat(30)}"\n  ]\n}` },
  ]);
});

test("a failing test shows each call with its arguments, what it returned, and expected against got", async () => {
  const failed = only(
    await run(
      buildLabScript(
        finalState,
        `test("adds after replacing", () => { assert.equal(getFinalState(0, [5, (n) => n + 1]), 6); });`,
      ),
    ),
  );
  assert.equal(failed.passed, false);
  assert.equal(failed.error, "Expected 6, got (n) => n + 1");
  assert.deepEqual(failed.calls, [{ call: "getFinalState(0, [5, (n) => n + 1])", returned: "(n) => n + 1" }]);
  assert.deepEqual(failed.mismatch, { expected: "6", actual: "(n) => n + 1", path: null });
});

test("deepEqual names the first field that differs", async () => {
  const failed = only(
    await run(
      buildLabScript(
        "const order = () => [{ id: 1, qty: 2 }, { id: 2, qty: 3 }];",
        `test("qty", () => { assert.deepEqual(order(), [{ id: 1, qty: 2 }, { id: 2, qty: 4 }]); });`,
      ),
    ),
  );
  assert.deepEqual(failed.mismatch, {
    expected: "[{ id: 1, qty: 2 }, { id: 2, qty: 4 }]",
    actual: "[{ id: 1, qty: 2 }, { id: 2, qty: 3 }]",
    path: "[1].qty",
    expectedAt: "4",
    actualAt: "3",
  });
});

test("calls record the arguments as they were passed, async results, throws and classes", async () => {
  const failed = only(
    await run(
      buildLabScript(
        `function push(list) { list.push(1); return list.length; }
async function later(n) { return n * 2; }
function boom() { throw new Error("nope"); }
class Counter { constructor(start) { this.count = start; } }`,
        `test("calls", async () => {
           push([]);
           await later(2);
           try { boom(); } catch {}
           assert.equal(new Counter(3).count, 4);
         });`,
      ),
    ),
  );
  assert.deepEqual(failed.calls, [
    { call: "push([])", returned: "1" },
    { call: "later(2)", returned: "4" },
    { call: "boom()", threw: "Error: nope" },
    { call: "new Counter(3)", returned: "Counter { count: 3 }" },
  ]);
});

test("a long function in a call shows only its start", async () => {
  const failed = only(
    await run(
      buildLabScript(
        "function apply(fn, value) { return fn(value); }",
        `test("long", () => {
           assert.equal(apply(async (value) => { const doubled = value * 2; return doubled + 1000000; }, 1), 0);
           assert.equal(apply(function triple(n) { const tripled = n * 3; return tripled + 1000000000; }, 1), 0);
         });`,
      ),
    ),
  );
  assert.equal(failed.calls?.[0].call, "apply(async (value) => …, 1)");
});

test("recording calls leaves the learner's variables shared with the tests", async () => {
  const result = await run(
    buildLabScript(
      "let count = 0;\nconst inc = () => ++count;",
      "test('shared', () => { count = 5; assert.equal(inc(), 6); assert.equal(count, 6); });",
    ),
  );
  assert.deepEqual(result.type === "tests" && result.results.map((item) => item.passed), [true]);
});

test("Try it returns the value and the console output of one call, with the tests' helpers but not the tests", async () => {
  const tests = `const queueOf = (...updates) => updates;\ntest("never runs", () => console.log("ran"));`;
  assert.deepEqual(await run(buildTryScript(finalState, tests, "getFinalState(0, queueOf(5, (n) => n + 1))")), {
    type: "try",
    ok: true,
    value: "(n) => n + 1",
    console: [{ level: "log", text: "queue [5, (n) => n + 1]" }],
  });
  const double = "const double = (n) => n * 2;";
  for (const input of [
    "const x = double(2);\nreturn x + 1;",
    "const x = double(2);\nx + 1;",
    "double(2.5);",
    "const x = double(2);\n[\n  x + 1,\n][0]",
  ])
    assert.deepEqual(await run(buildTryScript(double, "", input)), { type: "try", ok: true, value: "5", console: [] });
  assert.deepEqual(await run(buildTryScript(double, "", "if (double(1)) {\n  double(3);\n}")), {
    type: "try",
    ok: true,
    value: "undefined",
    console: [],
  });
  assert.deepEqual(await run(buildTryScript("", "", "missing(1)")), {
    type: "try",
    ok: false,
    value: "ReferenceError: missing is not defined",
    console: [],
  });
});
