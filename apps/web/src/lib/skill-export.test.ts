import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSkillBundle } from "./skill-bundle";
import { exportSkillZip } from "./skill-export";

const files = {
  "SKILL.md": "---\nname: resume-review\ndescription: Review a resume.\n---\n\nUse the [checklist](references/checklist.md).\n",
  "references/checklist.md": "# Checklist\n\nCheck dates and impact.\n",
};

test("exported ZIP round-trips through the importer without changing content or digest", async () => {
  const original = await parseSkillBundle("resume-review.zip", await exportSkillZip("resume-review", files));
  const exported = await exportSkillZip(original.slug, original.files);
  const reimported = await parseSkillBundle("resume-review.zip", exported);
  assert.deepEqual(reimported.files, original.files);
  assert.equal(reimported.digest, original.digest);
  assert.equal(reimported.slug, original.slug);
});

test("export refuses unsafe stored paths", async () => {
  await assert.rejects(
    exportSkillZip("resume-review", { ...files, "../secret.md": "no" }),
    /Invalid stored skill path/,
  );
  await assert.rejects(
    exportSkillZip("resume-review", { ...files, "references/../secret.md": "no" }),
    /Invalid stored skill path/,
  );
});
