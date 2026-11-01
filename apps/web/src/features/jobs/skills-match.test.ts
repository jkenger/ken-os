import assert from "node:assert/strict";
import { test } from "node:test";
import { matchSkills } from "./skills-match";

test("a posting skill present in the Profile's skills matches, case and punctuation insensitive", () => {
  const result = matchSkills(["typescript", "node.js", "ci-cd"], ["TypeScript", "Node.js", "React"]);
  assert.deepEqual(result, [
    { skill: "typescript", inProfile: true },
    { skill: "node.js", inProfile: true },
    { skill: "ci-cd", inProfile: false },
  ]);
});

test("the Profile's own grouped skills flatten before matching", () => {
  const result = matchSkills(["react"], ["React", "TypeScript"]);
  assert.deepEqual(result, [{ skill: "react", inProfile: true }]);
});

test("no posting skills returns an empty list, never thrown", () => {
  assert.deepEqual(matchSkills([], ["React"]), []);
});

test("no Profile skills means nothing matches", () => {
  const result = matchSkills(["react", "typescript"], []);
  assert.deepEqual(result, [
    { skill: "react", inProfile: false },
    { skill: "typescript", inProfile: false },
  ]);
});
