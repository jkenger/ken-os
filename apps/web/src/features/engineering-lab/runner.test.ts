import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { PGlite } from "@electric-sql/pglite";
import { scoreProbe } from "@ken-os/domain";
import { assessment, labs } from "./generated/curriculum.generated";
import { labSolutions } from "./generated/lab-solutions.generated";
import { buildLabScript, buildPredictScript, type WorkerMessage } from "./runner/harness";

// Node stand-in for the browser worker. Only for repo-authored code in tests; vm is not a security boundary.
async function run(script: string, timeoutMs = 3000, db?: PGlite): Promise<WorkerMessage> {
  const context = vm.createContext({ setTimeout, clearTimeout, AbortController, DOMException, EventTarget, Event, db });
  try { vm.runInContext(script, context); } catch { /* reported through __result */ }
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
    if (result.type === "tests") assert.ok(result.results.some((item) => !item.passed), "the starter should not already pass");
  });

  test(`${lab.id}: the solution passes every test`, async () => {
    const result = await run(buildLabScript(labSolutions[lab.id], lab.tests));
    assert.equal(result.type, "tests");
    if (result.type === "tests") {
      assert.ok(result.results.length > 0);
      assert.deepEqual(result.results.filter((item) => !item.passed), []);
    }
  });
}

// Database labs run against real PGlite; the browser imports it from a CDN, these tests use the installed copy.
for (const lab of labs.filter((item) => item.runner === "pglite")) {
  const runDb = async (code: string) => {
    const db = new PGlite();
    try { return await run(buildLabScript(code, lab.tests, { pglite: { url: null, setup: lab.setup } }), 30_000, db); }
    finally { await db.close(); }
  };

  test(`${lab.id}: the starter fails at least one test`, async () => {
    const result = await runDb(lab.starter);
    assert.equal(result.type, "tests", JSON.stringify(result));
    if (result.type === "tests") assert.ok(result.results.some((item) => !item.passed), "the starter should not already pass");
  });

  test(`${lab.id}: the solution passes every test`, async () => {
    const result = await runDb(labSolutions[lab.id]);
    assert.equal(result.type, "tests", JSON.stringify(result));
    if (result.type === "tests") {
      assert.ok(result.results.length > 0);
      assert.deepEqual(result.results.filter((item) => !item.passed), []);
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
  const questions = [{ id: "a", prompt: "A?", options: ["yes", "no"], why: "Because." }, { id: "b", prompt: "B?", options: ["yes", "no"], why: "Because." }];
  const score = scoreProbe(questions, { a: "yes", b: "yes" }, { a: "yes", b: "no" });
  assert.equal(score.passed, 1);
  assert.equal(score.failed, 1);
  assert.match(score.results[1].error!, /Actually: no/);
});

test("predict scripts capture real event-loop order", async () => {
  const result = await run(buildPredictScript(`
    console.log("A");
    setTimeout(() => console.log("B"), 0);
    Promise.resolve().then(() => console.log("C"));
    console.log("D");
  `));
  assert.deepEqual(result, { type: "output", logs: ["A", "D", "C", "B"] });
});

test("every predict question in the assessment stores what its code really prints", async () => {
  for (const question of assessment.questions.filter((item) => item.kind === "predict")) {
    assert.deepEqual(await run(buildPredictScript(question.code!)), { type: "output", logs: question.expectedOutput }, question.id);
  }
});

test("a syntax error is reported instead of hanging", async () => {
  const result = await run(buildLabScript("function broken( {", "test('x', () => {});"));
  assert.equal(result.type, "error");
});

test("lab code and tests share one scope, including let and const", async () => {
  const result = await run(buildLabScript("const double = (n) => n * 2; let seed = 1;", "test('scope', () => { assert.equal(double(seed), 2); });"));
  assert.deepEqual(result.type === "tests" && result.results, [{ name: "scope", passed: true }]);
});
