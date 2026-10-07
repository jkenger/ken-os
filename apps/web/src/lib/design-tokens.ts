import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Reads the design system snapshot: a word-for-word copy of the Claude design system's tokens.json, pulled by the
// design-system-sync skill. Nothing in the app edits it.

type Token = { name: string; value: string; usage?: string };
type Family = { tokens: Token[] };

export type DesignTokens = {
  name: string;
  color: { themes: { id: string; name: string }[]; tokens: { name: string; value: string | Record<string, string>; usage?: string }[] };
  type: { families: Record<string, string> };
  spacing: Family;
  radius: Family;
  shadow: Family;
  meta: { version: string; status: string; statusLabel: string };
};

const snapshotPath = resolve(dirname(fileURLToPath(import.meta.url)), "../../design-system/tokens.json");

export function loadDesignTokens(path = snapshotPath): DesignTokens {
  return JSON.parse(readFileSync(path, "utf8")) as DesignTokens;
}

const alias = /^\{([A-Za-z0-9][A-Za-z0-9_.-]*)\}$/;

/** A colour token's value in the first theme, written as CSS: an alias becomes var(--other). */
function colorCss(value: string | Record<string, string>, theme: string) {
  const raw = typeof value === "string" ? value : value[theme];
  const match = alias.exec(raw);
  return match ? `var(--${match[1]})` : raw;
}

/** Resolves a colour to its hex value, following aliases, for contrast checks. */
export function resolveColor(tokens: DesignTokens, name: string, seen: string[] = []): string {
  const token = tokens.color.tokens.find((item) => item.name === name);
  if (!token) throw new Error(`Unknown colour token: ${name}`);
  const theme = tokens.color.themes[0].id;
  const raw = typeof token.value === "string" ? token.value : token.value[theme];
  const match = alias.exec(raw);
  if (!match) return raw;
  if (seen.includes(name)) throw new Error(`Colour alias cycle at ${name}`);
  return resolveColor(tokens, match[1], [...seen, name]);
}

/** The CSS variables the app reads, named exactly as the design system names them. */
export function tokenCss(tokens: DesignTokens) {
  const theme = tokens.color.themes[0].id;
  const lines = [
    ...tokens.color.tokens.map((token) => `--${token.name}: ${colorCss(token.value, theme)};`),
    ...Object.entries(tokens.type.families).map(([key, stack]) => `--font-${key}: ${stack};`),
    ...[tokens.spacing, tokens.radius, tokens.shadow].flatMap((family) => family.tokens.map((token) => `--${token.name}: ${token.value};`)),
  ];
  return `/* Generated from design-system/tokens.json (${tokens.name} ${tokens.meta.version}, ${tokens.meta.status}), a copy of the Claude design system. Do not edit. */\n:root {\n${lines.map((line) => `  ${line}`).join("\n")}\n}\n`;
}
