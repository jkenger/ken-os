import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { test } from "node:test";

// Screens are built from the shadcn/ui primitives in components/ui, kept as the registry ships them. A raw control
// or a hand-built widget role outside that folder means a primitive was skipped; add it with
// `pnpm dlx shadcn@latest add <name>` (or the shadcn MCP server) and use it instead.
// See docs/architecture/shadcn-audit.md.

const srcRoot = join(__dirname, "..");

/** Hand-built widgets that no shadcn primitive covers, each with the reason. */
const allowed: { file: string; pattern: RegExp; reason: string }[] = [
  {
    file: "components/terms/term-lookup.tsx",
    pattern: /role="dialog"/,
    reason: "Non-modal card anchored to a text selection; Popover would take focus and close on the selecting mouseup",
  },
  {
    file: "components/lab-ui-preview/parts.tsx",
    pattern: /role="dialog"/,
    reason: "Design-preview copy of the term lookup card",
  },
];

const rawControl = /<(button|input|select|textarea|option|label|table|dialog)(?=[\s>/])/g;
const widgetRole =
  /role="(dialog|alertdialog|tablist|tab|tabpanel|switch|menu|menuitem|listbox|combobox|tooltip|checkbox|radiogroup)"/g;
const directRadix = /from "(radix-ui|@radix-ui\/[^"]+)"/g;

function screenFiles() {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.name.endsWith(".tsx")) files.push(relative(srcRoot, path).split(sep).join("/"));
    }
  };
  walk(srcRoot);
  return files.filter((file) => !file.startsWith("components/ui/")).sort();
}

export function findBypasses(
  files = screenFiles(),
  read = (file: string) => readFileSync(join(srcRoot, file), "utf8"),
) {
  const found: string[] = [];
  for (const file of files) {
    const source = read(file);
    for (const pattern of [rawControl, widgetRole, directRadix]) {
      for (const match of source.matchAll(pattern)) {
        if (allowed.some((entry) => entry.file === file && entry.pattern.test(match[0]))) continue;
        const line = source.slice(0, match.index).split("\n").length;
        found.push(`${file}:${line} ${match[0]}`);
      }
    }
  }
  return found;
}

test("screens use the shadcn primitives in components/ui", () => {
  assert.deepEqual(findBypasses(), [], "Use or add a shadcn primitive in components/ui instead of a raw control.");
});

test("the scan catches raw controls, widget roles and direct Radix imports", () => {
  const source = [
    `import { Dialog } from "radix-ui";`,
    `export const A = () => <div role="tablist"><button type="button">Go</button><Button>Ok</Button><input /></div>;`,
  ].join("\n");
  assert.deepEqual(
    findBypasses(["components/example.tsx"], () => source),
    [
      "components/example.tsx:2 <button",
      "components/example.tsx:2 <input",
      'components/example.tsx:2 role="tablist"',
      'components/example.tsx:1 from "radix-ui"',
    ],
  );
});
