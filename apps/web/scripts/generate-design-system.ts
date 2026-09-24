import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cssTokenEntries } from "../src/features/design-system/contract";
import { designSkillFiles } from "../src/features/design-system/skill";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const repoRoot = resolve(scriptDirectory, "../../..");
const mode = process.argv[2];
if (mode !== "--write" && mode !== "--check") {
  throw new Error("Use --write to regenerate or --check to verify generated design files.");
}

const css = `/* Generated from features/design-system/contract.ts. Do not edit. */\n:root {\n${cssTokenEntries.map(([name, value]) => `  ${name}: ${value};`).join("\n")}\n}\n`;
const outputs = new Map<string, string>([
  [resolve(webRoot, "src/app/design-tokens.generated.css"), css],
  ...Object.entries(designSkillFiles()).map(([name, content]) => [resolve(repoRoot, ".agents/skills/ken-os-design", name), content] as const),
]);

let stale = false;
for (const [path, content] of outputs) {
  if (mode === "--write") {
    writeFileSync(path, content, "utf8");
    continue;
  }
  let actual = "";
  try { actual = readFileSync(path, "utf8"); } catch { /* missing output */ }
  if (actual !== content) {
    stale = true;
    console.error(`Generated design file is stale: ${path}`);
  }
}

if (stale) process.exitCode = 1;
else console.log(mode === "--write" ? "Design files generated." : "Design files are current.");
