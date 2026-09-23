import { once } from "node:events";
import { ZipFile } from "yazl";

const REFERENCE_PATH = /^references\/(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+\.md$/;

export async function exportSkillZip(slug: string, files: Record<string, string>): Promise<Buffer> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !files["SKILL.md"]) {
    throw new Error("Invalid stored skill.");
  }
  const paths = Object.keys(files).sort();
  if (paths.some((path) =>
    (path !== "SKILL.md" && !REFERENCE_PATH.test(path)) ||
    path.split("/").some((part) => part === "." || part === "..")
  )) {
    throw new Error("Invalid stored skill path.");
  }

  const archive = new ZipFile();
  for (const path of paths) {
    archive.addBuffer(Buffer.from(files[path], "utf8"), `${slug}/${path}`);
  }
  archive.end();
  const chunks: Buffer[] = [];
  archive.outputStream.on("data", (chunk: Buffer) => chunks.push(chunk));
  await once(archive.outputStream, "end");
  return Buffer.concat(chunks);
}
