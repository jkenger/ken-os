import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDesignTokens, tokenCss } from "../src/lib/design-tokens";

// Turns the design system snapshot (design-system/tokens.json, a copy of the Claude design system) into the app's
// CSS variables. The snapshot is the only input; edit the Claude design system and sync, never this output.
const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2];
if (mode !== "--write" && mode !== "--check") {
  throw new Error("Use --write to regenerate or --check to verify the design token CSS.");
}

const output = resolve(webRoot, "src/app/design-tokens.generated.css");
const css = tokenCss(loadDesignTokens());

if (mode === "--write") {
  writeFileSync(output, css, "utf8");
  console.log("Design tokens generated.");
} else {
  let actual = "";
  try { actual = readFileSync(output, "utf8"); } catch { /* missing output */ }
  if (actual.replace(/\r\n/g, "\n") !== css) {
    console.error(`Design token CSS is stale: ${output}. Run pnpm --filter @ken-os/web design:generate.`);
    process.exitCode = 1;
  } else {
    console.log("Design tokens are current.");
  }
}
