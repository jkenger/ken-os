import { createHash } from "node:crypto";
import { fromBufferPromise } from "yauzl";
import { parseDocument } from "yaml";

const MAX_UPLOAD_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 256 * 1024;
const MAX_FILE_BYTES = 128 * 1024;
const MAX_MAIN_BYTES = 16 * 1024;
const MAX_FILES = 30;

export interface ParsedSkillBundle {
  slug: string;
  name: string;
  description: string;
  files: Record<string, string>;
  digest: string;
}

export class SkillBundleError extends Error {}

function validPath(path: string): boolean {
  if (!path || path.startsWith("/") || path.includes("\\") || path.includes(":") || path.includes("\0")) return false;
  return path.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}

function decodeMarkdown(bytes: Buffer): string {
  try {
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (value.includes("\0")) throw new Error("NUL byte");
    return value;
  } catch {
    throw new SkillBundleError("Skill files must be UTF-8 Markdown text.");
  }
}

async function readZip(buffer: Buffer): Promise<Record<string, string>> {
  const archive = await fromBufferPromise(buffer, {
    lazyEntries: true,
    strictFileNames: true,
    validateEntrySizes: true,
  }).catch(() => { throw new SkillBundleError("The ZIP archive could not be opened."); });
  const entries = new Map<string, string>();
  const seenPaths = new Set<string>();
  let totalBytes = 0;
  let count = 0;

  try {
    for await (const entry of archive.eachEntry()) {
      count++;
      if (count > MAX_FILES) throw new SkillBundleError(`A skill may contain at most ${MAX_FILES} files and folders.`);
      const path = entry.fileName;
      const isDirectory = path.endsWith("/");
      if (!validPath(isDirectory ? path.slice(0, -1) : path)) {
        throw new SkillBundleError(`Unsafe archive path: ${path}`);
      }
      const fileType = (entry.externalFileAttributes >>> 16) & 0o170000;
      if (fileType === 0o120000 || (fileType !== 0 && fileType !== 0o100000 && fileType !== 0o040000)) {
        throw new SkillBundleError("Archive links and special files are not allowed.");
      }
      if (isDirectory) continue;
      if (entry.isEncrypted()) throw new SkillBundleError("Encrypted ZIP files are not supported.");
      if (entry.uncompressedSize > MAX_FILE_BYTES || totalBytes + entry.uncompressedSize > MAX_TOTAL_BYTES) {
        throw new SkillBundleError("Skill files exceed the size limit.");
      }
      const chunks: Buffer[] = [];
      let readBytes = 0;
      const stream = await archive.openReadStreamPromise(entry);
      for await (const chunk of stream) {
        const bytes = Buffer.from(chunk as Buffer);
        readBytes += bytes.length;
        if (readBytes > MAX_FILE_BYTES || totalBytes + readBytes > MAX_TOTAL_BYTES) {
          stream.destroy();
          throw new SkillBundleError("Skill files exceed the size limit.");
        }
        chunks.push(bytes);
      }
      totalBytes += readBytes;
      if (seenPaths.has(path.toLowerCase())) throw new SkillBundleError(`Duplicate archive path: ${path}`);
      seenPaths.add(path.toLowerCase());
      entries.set(path, decodeMarkdown(Buffer.concat(chunks)));
    }
  } catch (error) {
    if (error instanceof SkillBundleError) throw error;
    throw new SkillBundleError("The ZIP archive is invalid or corrupt.");
  } finally {
    archive.close();
  }

  const paths = [...entries.keys()];
  const hasRootManifest = paths.includes("SKILL.md");
  const roots = new Set(paths.map((path) => path.split("/")[0]));
  const prefix = !hasRootManifest && roots.size === 1 ? `${paths[0]?.split("/")[0]}/` : "";
  const files: Record<string, string> = {};
  for (const [path, value] of entries) {
    const normalized = prefix ? path.slice(prefix.length) : path;
    if (!normalized || (normalized !== "SKILL.md" && !/^references\/(?:[a-z0-9_.-]+\/)*[a-z0-9_.-]+\.md$/.test(normalized))) {
      throw new SkillBundleError(`Only SKILL.md and references/*.md are supported: ${path}`);
    }
    if (files[normalized] !== undefined) throw new SkillBundleError(`Duplicate skill path: ${normalized}`);
    files[normalized] = value;
  }
  return files;
}

export async function parseSkillBundle(filename: string, bytes: Buffer): Promise<ParsedSkillBundle> {
  if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) {
    throw new SkillBundleError("Upload a file smaller than 512 KB.");
  }
  let files: Record<string, string>;
  if (filename.toLowerCase() === "skill.md") {
    if (bytes.length > MAX_MAIN_BYTES) throw new SkillBundleError("SKILL.md must be smaller than 16 KB.");
    files = { "SKILL.md": decodeMarkdown(bytes) };
  } else if (filename.toLowerCase().endsWith(".zip")) {
    files = await readZip(bytes);
  } else {
    throw new SkillBundleError("Upload SKILL.md or a ZIP containing it and Markdown references.");
  }
  const manifest = files["SKILL.md"];
  if (!manifest) throw new SkillBundleError("The bundle must contain SKILL.md.");
  if (Buffer.byteLength(manifest) > MAX_MAIN_BYTES) throw new SkillBundleError("SKILL.md must be smaller than 16 KB.");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(manifest);
  if (!frontmatter || !manifest.slice(frontmatter[0].length).trim()) {
    throw new SkillBundleError("SKILL.md needs YAML frontmatter and instructions.");
  }
  const document = parseDocument(frontmatter[1], { uniqueKeys: true });
  if (document.errors.length) throw new SkillBundleError("SKILL.md has invalid YAML frontmatter.");
  let metadata: Record<string, unknown> | null;
  try {
    metadata = document.toJS({ maxAliasCount: 20 }) as Record<string, unknown> | null;
  } catch {
    throw new SkillBundleError("SKILL.md has invalid YAML frontmatter.");
  }
  const name = metadata?.name;
  const description = metadata?.description;
  if (typeof name !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name) || name.length > 63) {
    throw new SkillBundleError("Skill name must be lowercase words separated by hyphens (up to 63 characters).");
  }
  if (typeof description !== "string" || !description.trim() || description.length > 500) {
    throw new SkillBundleError("Skill description is required and must be under 500 characters.");
  }
  const digest = createHash("sha256").update(JSON.stringify(Object.entries(files).sort())).digest("hex");
  return { slug: name, name, description: description.trim(), files, digest };
}
