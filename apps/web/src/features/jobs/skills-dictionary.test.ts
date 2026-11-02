import assert from "node:assert/strict";
import { test } from "node:test";
import { formatSkillName, normalizeSkill, skillEntry } from "./skills-dictionary";

test("known skills format to their proper term, not a naive capitalization", () => {
  assert.equal(formatSkillName("ai"), "AI");
  assert.equal(formatSkillName("aws"), "AWS");
  assert.equal(formatSkillName("docker"), "Docker");
  assert.equal(formatSkillName("github-copilot"), "Github Copilot");
  assert.equal(formatSkillName("nodejs"), "Node.js");
});

test("formatting is case and separator insensitive on the input", () => {
  assert.equal(formatSkillName("Node.js"), "Node.js");
  assert.equal(formatSkillName("NODE_JS"), "Node.js");
  assert.equal(formatSkillName("node js"), "Node.js");
});

test("common acronyms and proper names the fallback would otherwise mis-case are in the dictionary", () => {
  assert.equal(formatSkillName("api"), "API");
  assert.equal(formatSkillName("github"), "GitHub");
  assert.equal(formatSkillName("sql"), "SQL");
  assert.equal(formatSkillName("rdbms"), "RDBMS");
  assert.equal(formatSkillName("rabbitmq"), "RabbitMQ");
  assert.equal(formatSkillName("wordpress"), "WordPress");
});

test("an unknown skill falls back to title case, split on separators", () => {
  assert.equal(formatSkillName("machine-learning"), "Machine Learning");
  assert.equal(formatSkillName("some_new_tool"), "Some New Tool");
  assert.equal(formatSkillName("terraform"), "Terraform");
});

test("aliases of a known skill all normalize to the same slug", () => {
  assert.equal(normalizeSkill("node"), normalizeSkill("nodejs"));
  assert.equal(normalizeSkill("node.js"), normalizeSkill("nodejs"));
  assert.equal(normalizeSkill("Node JS"), normalizeSkill("nodejs"));
});

test("an unknown skill still normalizes to something stable and comparable", () => {
  assert.equal(normalizeSkill("Some New Tool"), normalizeSkill("some-new-tool"));
});

test("skillEntry returns the full dictionary entry for a known skill, including metadata", () => {
  const entry = skillEntry("docker");
  assert.ok(entry);
  assert.equal(entry.name, "Docker");
  assert.equal(entry.family, "container");
  assert.ok(entry.logoSlug);
  assert.ok(entry.description);
});

test("skillEntry returns null for an unknown skill, not a guess", () => {
  assert.equal(skillEntry("some-made-up-tool-xyz"), null);
});

test("two skills in the same family are related but not the same skill", () => {
  const react = skillEntry("react");
  const vue = skillEntry("vue");
  assert.ok(react);
  assert.ok(vue);
  assert.equal(react.family, vue.family);
  assert.notEqual(normalizeSkill("react"), normalizeSkill("vue"));
});
