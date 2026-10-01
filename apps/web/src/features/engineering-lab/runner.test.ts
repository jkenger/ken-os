import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { labs } from "./generated/curriculum.generated";
import { labSolutions } from "./generated/lab-solutions.generated";
import { buildLabScript, buildPredictScript, type WorkerMessage } from "./runner/harness";

// Node stand-in for the browser worker. Only for repo-authored code in tests; vm is not a security boundary.
async function run(script: string, timeoutMs = 3000): Promise<WorkerMessage> {
  const context = vm.createContext({ setTimeout, clearTimeout, AbortController, DOMException, EventTarget, Event });
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

test("predict scripts capture real event-loop order", async () => {
  const result = await run(buildPredictScript(`
    console.log("A");
    setTimeout(() => console.log("B"), 0);
    Promise.resolve().then(() => console.log("C"));
    console.log("D");
  `));
  assert.deepEqual(result, { type: "output", logs: ["A", "D", "C", "B"] });
});

test("a syntax error is reported instead of hanging", async () => {
  const result = await run(buildLabScript("function broken( {", "test('x', () => {});"));
  assert.equal(result.type, "error");
});

test("lab code and tests share one scope, including let and const", async () => {
  const result = await run(buildLabScript("const double = (n) => n * 2; let seed = 1;", "test('scope', () => { assert.equal(double(seed), 2); });"));
  assert.deepEqual(result.type === "tests" && result.results, [{ name: "scope", passed: true }]);
});
