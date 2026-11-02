import assert from "node:assert/strict";
import { test } from "node:test";
import { matchSkills } from "./skills-match";

test("a posting skill present in the Profile's skills is have, case and punctuation insensitive", () => {
  const result = matchSkills(["typescript", "node.js"], ["TypeScript", "Node.js"]);
  assert.deepEqual(result, [
    { skill: "TypeScript", status: "have" },
    { skill: "Node.js", status: "have" },
  ]);
});

test("a posting skill in the same family as a Profile skill, but not the same skill, is related", () => {
  const result = matchSkills(["vue"], ["React"]);
  assert.deepEqual(result, [{ skill: "Vue", status: "related", relatedTo: ["React"] }]);
});

test("a posting skill with no match at all, and no family overlap, is missing", () => {
  const result = matchSkills(["kubernetes"], ["React"]);
  assert.deepEqual(result, [{ skill: "Kubernetes", status: "missing" }]);
});

test("the display name is the formatted skill name, not the raw posting text", () => {
  const result = matchSkills(["nodejs"], []);
  assert.equal(result[0]!.skill, "Node.js");
});

test("an alias normalizes the same as its canonical skill for have-matching", () => {
  const result = matchSkills(["node"], ["Node.js"]);
  assert.deepEqual(result, [{ skill: "Node.js", status: "have" }]);
});

test("have wins over related when both would apply", () => {
  const result = matchSkills(["react"], ["React", "Vue"]);
  assert.deepEqual(result, [{ skill: "React", status: "have" }]);
});

test("an unknown posting skill with no dictionary family is missing unless the exact text matches", () => {
  const result = matchSkills(["some-made-up-tool"], ["Some Made Up Tool"]);
  assert.deepEqual(result, [{ skill: "Some Made Up Tool", status: "have" }]);
});

test("no posting skills returns an empty list, never thrown", () => {
  assert.deepEqual(matchSkills([], ["React"]), []);
});

test("no Profile skills means everything is missing", () => {
  const result = matchSkills(["react", "typescript"], []);
  assert.deepEqual(result, [
    { skill: "React", status: "missing" },
    { skill: "TypeScript", status: "missing" },
  ]);
});
