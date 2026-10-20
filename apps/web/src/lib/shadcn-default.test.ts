import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

// The app runs on shadcn's default setup (the Luma preset), and the Loots look is built on top of it one deliberate
// change at a time. This test keeps the old Studio values from creeping back: no Loots-only colour, shadow, font or
// radius names, no Google Fonts link (fonts come from next/font), and no hex colours in class strings. Additions go in
// the "Loots" section at the end of globals.css. See docs/architecture/design-system-shadcn-setup.md.

const srcRoot = join(__dirname, "..");
const self = "lib/shadcn-default.test.ts";
const marker = "/* Loots: additions on top of the shadcn default */";

const kenToken = "canvas|quiet|signal|tint|table-head|row-hover|rail(?:-lit|-soft)?|status-[a-z-]+|primary-hover";
const checks: { name: string; pattern: RegExp }[] = [
  {
    name: "Loots colour class",
    pattern: new RegExp(
      `(?<![\\w-])(?:bg|text|border(?:-[trblxy])?|ring|outline|fill|stroke|decoration|from|to|via|divide|accent|caret|placeholder)-(?:${kenToken})(?![\\w-])`,
    ),
  },
  { name: "Loots shadow class", pattern: /(?<![\w-])shadow-(?:panel|tab)(?![\w-])/ },
  { name: "font-display class", pattern: /(?<![\w-])font-display(?![\w-])/ },
  { name: "arbitrary font weight", pattern: /(?<![\w-])font-\[/ },
  {
    name: "Loots CSS variable",
    pattern: new RegExp(
      `--(?:color-)?(?:${kenToken}|shadow-panel|shadow-tab|font-display|font-body|radius-(?:item|menu|tab|panel))(?![\\w-])`,
    ),
  },
  { name: "Google Fonts link", pattern: /fonts\.(?:googleapis|gstatic)\.com/ },
  { name: "hex colour in a class", pattern: /-\[#[0-9a-fA-F]{3,8}\]/ },
];

function sourceFiles() {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.(tsx?|css)$/.test(entry.name)) files.push(relative(srcRoot, path).split(sep).join("/"));
    }
  };
  walk(srcRoot);
  return files.filter((file) => file !== self);
}

test("no Loots design values remain in apps/web/src", () => {
  const found: string[] = [];
  for (const file of sourceFiles()) {
    const lines = readFileSync(join(srcRoot, file), "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const { name, pattern } of checks)
        if (pattern.test(line)) found.push(`${file}:${index + 1} ${name}: ${line.trim().slice(0, 120)}`);
    });
  }
  assert.deepEqual(found, []);
});

test("globals.css is the shadcn default followed by the Loots section", () => {
  const css = readFileSync(join(srcRoot, "app/globals.css"), "utf8");
  assert.equal(css.split(marker).length, 2, "globals.css needs exactly one Loots section marker");
  const [base] = css.split(marker);
  assert.match(base, /^@import "tailwindcss";\r?\n@import "tw-animate-css";\r?\n@import "shadcn\/tailwind\.css";/);
  assert.match(base, /--radius: 0\.625rem;/);
  assert.doesNotMatch(css, /@import url\(/, "fonts come from next/font, not a CSS import");
});
