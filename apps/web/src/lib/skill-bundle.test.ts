import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { test } from "node:test";
import { ZipFile } from "yazl";
import { parseSkillBundle, SkillBundleError } from "./skill-bundle";

const manifest =
  "---\nname: resume-review\ndescription: Review a resume using a checklist.\n---\n\nRead the resume, then use [the checklist](references/checklist.md).\n";

async function zip(files: Record<string, string>): Promise<Buffer> {
  const archive = new ZipFile();
  for (const [path, content] of Object.entries(files)) {
    archive.addBuffer(Buffer.from(content), path);
  }
  archive.end();
  const chunks: Buffer[] = [];
  archive.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
  await once(archive.outputStream, "end");
  return Buffer.concat(chunks);
}

test("accepts a standalone SKILL.md", async () => {
  const parsed = await parseSkillBundle("SKILL.md", Buffer.from(manifest));
  assert.equal(parsed.slug, "resume-review");
  assert.equal(parsed.files["SKILL.md"], manifest);
  assert.match(parsed.digest, /^[0-9a-f]{64}$/);
});

test("accepts this repository's hosted MVP skill", async () => {
  const root = resolve(process.cwd(), "../../.agents/skills/ship-hosted-mvp");
  const files = Object.fromEntries(
    await Promise.all(
      [
        "SKILL.md",
        "references/scope.md",
        "references/architecture.md",
        "references/stack.md",
      ].map(async (path) => [
        `ship-hosted-mvp/${path}`,
        await readFile(resolve(root, path), "utf8"),
      ]),
    ),
  );
  const parsed = await parseSkillBundle(
    "ship-hosted-mvp.zip",
    await zip(files),
  );
  assert.equal(parsed.slug, "ship-hosted-mvp");
  assert.equal(Object.keys(parsed.files).length, 4);
});

test("accepts a folder ZIP with Markdown references", async () => {
  const parsed = await parseSkillBundle(
    "resume-review.zip",
    await zip({
      "resume-review/SKILL.md": manifest,
      "resume-review/references/checklist.md":
        "# Check facts before suggesting changes",
    }),
  );
  assert.equal(
    parsed.files["references/checklist.md"],
    "# Check facts before suggesting changes",
  );
});

test("rejects scripts in an uploaded ZIP", async () => {
  await assert.rejects(
    parseSkillBundle(
      "resume-review.zip",
      await zip({
        "resume-review/SKILL.md": manifest,
        "resume-review/scripts/run.sh": "echo unsafe",
      }),
    ),
    SkillBundleError,
  );
});

test("rejects archive path traversal", async () => {
  const archive = await zip({ "safe/SKILL.md": manifest });
  const original = Buffer.from("safe/SKILL.md");
  const malicious = Buffer.from("../x/SKILL.md");
  assert.equal(original.length, malicious.length);
  for (
    let index = archive.indexOf(original);
    index !== -1;
    index = archive.indexOf(original, index + malicious.length)
  ) {
    malicious.copy(archive, index);
  }
  await assert.rejects(
    parseSkillBundle("unsafe.zip", archive),
    SkillBundleError,
  );
});

test("rejects malformed or missing frontmatter", async () => {
  await assert.rejects(
    parseSkillBundle("SKILL.md", Buffer.from("# No metadata")),
    SkillBundleError,
  );
  await assert.rejects(
    parseSkillBundle(
      "SKILL.md",
      Buffer.from(
        "---\nname: skill\nname: duplicate\ndescription: text\n---\nBody",
      ),
    ),
    SkillBundleError,
  );
});

test("rejects unexpected filenames and oversized manifests", async () => {
  await assert.rejects(
    parseSkillBundle("other.md", Buffer.from(manifest)),
    SkillBundleError,
  );
  await assert.rejects(
    parseSkillBundle("SKILL.md", Buffer.from(manifest + "x".repeat(17_000))),
    SkillBundleError,
  );
});
