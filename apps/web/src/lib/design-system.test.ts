import assert from "node:assert/strict";
import { test } from "node:test";
import { designSystem } from "../features/design-system/contract";
import { designSkillFiles } from "../features/design-system/skill";
import { parseSkillBundle } from "./skill-bundle";
import { exportSkillZip } from "./skill-export";

test("working design skill round-trips as a complete Markdown ZIP", async () => {
  const files = designSkillFiles();
  const zip = await exportSkillZip("ken-os-design", files);
  const parsed = await parseSkillBundle("ken-os-design.zip", zip);
  assert.equal(parsed.slug, "ken-os-design");
  assert.deepEqual(parsed.files, files);
  assert.deepEqual(Object.keys(parsed.files).sort(), ["SKILL.md", "references/components.md", "references/foundations.md"]);
  for (const content of Object.values(parsed.files)) {
    assert.match(content, new RegExp(designSystem.version.replaceAll(".", "\\.")));
    assert.match(content, /not yet approved/);
  }
});

test("exported palette reflects the design contract", () => {
  const foundations = designSkillFiles()["references/foundations.md"];
  for (const color of designSystem.colors) {
    assert.ok(foundations.includes(color.value), `Missing ${color.variable}`);
  }
});
