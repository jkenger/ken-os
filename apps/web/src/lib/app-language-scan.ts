import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { parse } from "@babel/parser";
import { bannedPhrases } from "./app-language-banned";

/** Reads screen copy out of the source and checks it against docs/product/app-language.md. */

export const srcRoot = join(__dirname, "..");

const excluded = [
  /\.test\./,
  /^components\/ui\//,
  /^app\/design-preview\//,
  /^components\/lab-ui-preview\//,
  /^components\/lab\/explore\//,
  /^components\/writing-studio-preview\.tsx$/,
  /^components\/project-memory-preview\.tsx$/,
  /^features\/engineering-lab\/preview\.ts$/,
  // Agent-facing Project Memory: agents read these errors, not the owner.
  /^features\/project-memory\/(contract|store)\.ts$/,
  /^app\/api\/memory\/agent\//,
];

// JSX attributes whose values are never read as text.
const nonTextAttributes = new Set([
  "className", "href", "src", "id", "key", "type", "name", "value", "defaultValue", "role", "variant", "size",
  "htmlFor", "method", "action", "target", "rel", "as", "side", "align", "mode", "autoComplete", "inputMode",
  "accept", "pattern", "dir", "lang", "tabIndex", "form", "encType", "viewBox", "d", "points", "transform",
  "fill", "stroke", "style", "sizes", "srcSet", "download", "step", "min", "max", "width", "height",
]);
const textAriaAttributes = new Set(["aria-label", "aria-description", "aria-roledescription", "aria-placeholder", "aria-valuetext"]);

export type CopyItem = { file: string; text: string; attribute?: string };
export type Violation = { file: string; text: string; rules: string[] };

/** Every scanned file, relative to `src` with forward slashes. */
export function screenFiles(): string[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.push(relative(srcRoot, path).split(sep).join("/"));
    }
  };
  walk(srcRoot);
  return files
    .filter((file) => file.endsWith(".tsx") || (file.startsWith("app/api/") && file.endsWith(".ts")) || /^features\/[^/]+\/api\.ts$/.test(file))
    .filter((file) => !excluded.some((pattern) => pattern.test(file)))
    .sort();
}

const clean = (text: string) => text.replace(/\s+/g, " ").trim();
// Lowercase tokens with no spaces are values, keys and paths ("receipt", "outline", "/api/skills"), not copy.
const codeLike = (text: string) => (/^[a-z0-9_./#:@?&=%+\-[\]]*$/.test(text) && /[a-z]/.test(text)) || /^\/\S*$/.test(text);

type Node = { type: string; [key: string]: unknown };
const isNode = (value: unknown): value is Node => typeof value === "object" && value !== null && typeof (value as Node).type === "string";
const skippedKeys = new Set(["loc", "start", "end", "range", "extra", "leadingComments", "trailingComments", "innerComments", "comments"]);
const expressionTsNodes = new Set(["TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSInstantiationExpression", "TSParameterProperty"]);

function attributeName(node: Node): string {
  const name = node.name as Node;
  return name.type === "JSXNamespacedName" ? `${(name.namespace as Node).name}:${(name.name as Node).name}` : String(name.name);
}

function templateText(node: Node): string {
  return (node.quasis as Node[]).map((quasi) => (quasi.value as { cooked?: string; raw: string }).cooked ?? (quasi.value as { raw: string }).raw).join("{}");
}

/** Static text of an element's children, with `{}` for each dynamic part. */
function staticChildrenText(node: Node): string {
  let text = "";
  for (const child of node.children as Node[]) {
    if (child.type === "JSXText") text += child.value as string;
    else if (child.type === "JSXExpressionContainer") {
      const expression = child.expression as Node;
      if (expression.type === "StringLiteral") text += expression.value as string;
      else if (expression.type === "TemplateLiteral") text += templateText(expression);
      else if (expression.type !== "JSXEmptyExpression") text += "{}";
    } else if (child.type === "JSXElement") text += staticChildrenText(child);
  }
  return clean(text);
}

export function collectCopy(file: string, source: string): { copy: CopyItem[]; headings: string[] } {
  const ast = parse(source, { sourceType: "module", plugins: file.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"] });
  const copy: CopyItem[] = [];
  const headings: string[] = [];
  const add = (raw: string, attribute: string | undefined, filterCode: boolean) => {
    const text = clean(raw);
    if (!text || (filterCode && codeLike(text))) return;
    copy.push(attribute ? { file, text, attribute } : { file, text });
  };

  const visit = (node: Node, attribute: string | undefined): void => {
    if (node.type.startsWith("TS") && !expressionTsNodes.has(node.type)) return;
    switch (node.type) {
      case "ImportDeclaration":
      case "ExportAllDeclaration":
        return;
      case "ExportNamedDeclaration":
        if (node.declaration) visit(node.declaration as Node, attribute);
        return;
      case "ObjectProperty":
      case "ObjectMethod":
      case "ClassProperty":
      case "ClassMethod":
        if (node.computed) visit(node.key as Node, attribute);
        if (node.value && isNode(node.value)) visit(node.value as Node, attribute);
        for (const key of ["params", "body"]) if (isNode(node[key]) || Array.isArray(node[key])) visitValue(node[key], attribute);
        return;
      case "JSXAttribute": {
        const name = attributeName(node);
        if (nonTextAttributes.has(name) || name.startsWith("data-") || (name.startsWith("aria-") && !textAriaAttributes.has(name))) return;
        const value = node.value as Node | null;
        if (!value) return;
        if (value.type === "StringLiteral") add(value.value as string, name, true);
        else visit(value, name);
        return;
      }
      case "JSXText":
        add(node.value as string, attribute, false);
        return;
      case "StringLiteral":
        add(node.value as string, attribute, true);
        return;
      case "TemplateLiteral":
        add(templateText(node), attribute, true);
        for (const expression of node.expressions as Node[]) visit(expression, attribute);
        return;
      case "JSXElement": {
        const opening = node.openingElement as Node;
        const tag = (opening.name as Node).name;
        if (tag === "h1" || tag === "h2" || tag === "h3") {
          const text = staticChildrenText(node);
          if (text) headings.push(text);
        }
        break;
      }
    }
    for (const [key, value] of Object.entries(node)) {
      if (!skippedKeys.has(key)) visitValue(value, attribute);
    }
  };
  const visitValue = (value: unknown, attribute: string | undefined) => {
    if (Array.isArray(value)) for (const item of value) visitValue(item, attribute);
    else if (isNode(value)) visit(value, attribute);
  };

  visit(ast.program as unknown as Node, undefined);
  return { copy, headings };
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const banned = bannedPhrases.map((entry) => ({
  ...entry,
  pattern: new RegExp(`${/^\w/.test(entry.phrase) ? "\\b" : ""}${escape(entry.phrase)}`, entry.ignoreCase ? "i" : ""),
}));

export function findViolations(files = screenFiles()): Violation[] {
  const found = new Map<string, Violation>();
  const flag = (file: string, text: string, rule: string) => {
    const key = `${file}\u0000${text}`;
    const violation = found.get(key) ?? { file, text, rules: [] };
    if (!violation.rules.includes(rule)) violation.rules.push(rule);
    found.set(key, violation);
  };

  for (const file of files) {
    const { copy, headings } = collectCopy(file, readFileSync(join(srcRoot, file), "utf8"));
    for (const item of copy) {
      if (item.text.includes("—")) flag(file, item.text, "em dash");
      for (const entry of banned) {
        if (entry.screenOnly && !file.endsWith(".tsx")) continue;
        if (entry.exceptFiles?.includes(file)) continue;
        if (item.attribute && entry.exceptAttributes?.includes(item.attribute)) continue;
        if (entry.pattern.test(item.text)) flag(file, item.text, `banned "${entry.phrase}"`);
      }
    }
    for (const text of headings) if (text.endsWith(".")) flag(file, text, "heading ends in a period");
  }
  return [...found.values()].sort((a, b) => a.file.localeCompare(b.file) || a.text.localeCompare(b.text));
}
