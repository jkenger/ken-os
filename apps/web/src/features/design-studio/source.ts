import type { ThemeToken, VariantGroup } from "./manifest";

// Reads component source for scripts/generate-studio-manifest.ts. A small scanner, not a parser: it handles the
// shapes the shadcn registry and the Loots wrappers are written in, and the tests pin those shapes.

/** Source with comments and string contents blanked to spaces, so braces and keywords inside them don't count. Keeps
 *  every offset, so positions found here index into the original source. */
function blank(source: string) {
  let out = "";
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === "//" || two === "/*") {
      const end = two === "//" ? source.indexOf("\n", i) : source.indexOf("*/", i) + 2;
      const stop = end <= 1 || end === -1 ? source.length : end;
      out += source.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
    } else if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
      const quote = source[i];
      let j = i + 1;
      while (j < source.length && source[j] !== quote) j += source[j] === "\\" ? 2 : 1;
      out += quote + source.slice(i + 1, j).replace(/[^\n]/g, " ") + quote;
      i = j + 1;
    } else {
      out += source[i];
      i += 1;
    }
  }
  return out;
}

/** The offset just past the brace that closes the one at `open`. */
function closing(code: string, open: number) {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}" && --depth === 0) return i + 1;
  }
  return code.length;
}

/** The offset of the bracket that closes the one at `open`, counting only that bracket pair. */
function matching(code: string, open: number, pair: "()" | "{}") {
  let depth = 0;
  for (let i = open; i < code.length; i += 1) {
    if (code[i] === pair[0]) depth += 1;
    else if (code[i] === pair[1] && --depth === 0) return i;
  }
  return code.length;
}

/** The keys of an object literal's top level, from `{` at `open`, with each value's range. */
function keys(source: string, code: string, open: number) {
  const end = closing(code, open);
  const found: { name: string; start: number; end: number }[] = [];
  let depth = 0;
  let i = open + 1;
  while (i < end - 1) {
    const char = code[i];
    if (char === "{" || char === "(" || char === "[") depth += 1;
    else if (char === "}" || char === ")" || char === "]") depth -= 1;
    else if (depth === 0) {
      const match = /^\s*(?:([A-Za-z_$][\w$-]*)|(["'])([^"']*)\2)\s*:/.exec(source.slice(i, end));
      const atStart = /[{,]\s*$/.test(code.slice(open, i + 1)) || i === open + 1;
      if (match && atStart) {
        const valueStart = i + match[0].length;
        let j = valueStart;
        let inner = 0;
        while (j < end - 1) {
          const c = code[j];
          if (c === "{" || c === "(" || c === "[") inner += 1;
          else if (c === "}" || c === ")" || c === "]") inner -= 1;
          else if (c === "," && inner === 0) break;
          j += 1;
        }
        found.push({ name: match[1] ?? match[3], start: valueStart, end: j });
        i = j + 1;
        continue;
      }
    }
    i += 1;
  }
  return found;
}

/** The names a file exports, in source order: `export function`, `export const` and `export { a, b }`. Types are
 *  left out, since the studio shows things that render or style. */
export function readExports(source: string) {
  const code = blank(source);
  const names: string[] = [];
  const pattern = /^export\s+(?:(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)|\{([^}]*)\})/gm;
  for (const match of code.matchAll(pattern)) {
    if (match[1] || match[2]) names.push(match[1] ?? match[2]);
    else
      for (const part of match[3].split(",")) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim();
        if (name && !part.trim().startsWith("type ")) names.push(name);
      }
  }
  return [...new Set(names)];
}

/** Variant groups from every cva() call in a file, merged by group name in source order. */
export function readVariants(source: string) {
  const code = blank(source);
  const groups = new Map<string, VariantGroup>();
  for (const call of code.matchAll(/\bcva\(/g)) {
    const callEnd = matching(code, call.index + 3, "()");
    // The config is the call's second argument: the first `{` outside brackets after the base classes.
    let configOpen = -1;
    let depth = 0;
    for (let i = call.index + 4; i < callEnd && configOpen === -1; i += 1) {
      const c = code[i];
      if (c === "(" || c === "[") depth += 1;
      else if (c === ")" || c === "]") depth -= 1;
      else if (c === "{" && depth === 0) configOpen = i;
    }
    if (configOpen === -1) continue;
    const config = keys(source, code, configOpen);
    const defaults = new Map<string, string>();
    const defaultsEntry = config.find((entry) => entry.name === "defaultVariants");
    if (defaultsEntry) {
      const open = code.indexOf("{", defaultsEntry.start);
      for (const entry of keys(source, code, open)) {
        const value = /^\s*["']([^"']*)["']/.exec(source.slice(entry.start, entry.end));
        if (value) defaults.set(entry.name, value[1]);
      }
    }
    const variantsEntry = config.find((entry) => entry.name === "variants");
    if (!variantsEntry) continue;
    for (const group of keys(source, code, code.indexOf("{", variantsEntry.start))) {
      const open = code.indexOf("{", group.start);
      if (open === -1 || open > group.end) continue;
      const options = keys(source, code, open).map((option) => option.name);
      const known = groups.get(group.name);
      if (known) known.options = [...new Set([...known.options, ...options])];
      else
        groups.set(group.name, {
          name: group.name,
          options,
          ...(defaults.has(group.name) ? { defaultOption: defaults.get(group.name) } : {}),
        });
    }
  }
  return [...groups.values()];
}

/** For each exported function in a wrapper file, the one components/ui primitive its body renders, by slug. A
 *  function that renders none, or more than one, wraps nothing. */
export function readWraps(source: string) {
  const code = blank(source);
  const local = new Map<string, string>();
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']@\/components\/ui\/([^"']+)["']/g))
    for (const part of match[1].split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
        ?.trim();
      if (name) local.set(name, match[2]);
    }
  const wraps: Record<string, string> = {};
  for (const match of code.matchAll(/^export\s+function\s+([A-Za-z_$][\w$]*)/gm)) {
    const params = code.indexOf("(", match.index);
    const open = code.indexOf("{", matching(code, params, "()"));
    const body = code.slice(open, closing(code, open));
    const used = new Set<string>();
    for (const tag of body.matchAll(/<([A-Z][\w$]*)[\s/>]/g)) {
      const slug = local.get(tag[1]);
      if (slug) used.add(slug);
    }
    if (used.size === 1) wraps[match[1]] = [...used][0];
  }
  return wraps;
}

/** The other components/ui primitives a file imports, by slug, in source order. These are its registry dependencies:
 *  shadcn writes them as imports from "@/components/ui/<slug>". */
export function readUses(source: string) {
  const slugs = [...source.matchAll(/\bfrom\s*["']@\/components\/ui\/([^"']+)["']/g)].map((match) => match[1]);
  return [...new Set(slugs)];
}

/** Every custom property set in a `:root` (or `:root, .light`) or `.dark` block of a stylesheet, in first-seen order. A
 *  later block wins, as in the cascade, so the Loots section's values replace shadcn's. */
export function readTheme(css: string) {
  const tokens = new Map<string, ThemeToken>();
  for (const block of css.matchAll(/^(:root(?:,\s*\.light)?|\.dark)\s*\{([^}]*)\}/gm)) {
    for (const line of block[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      const [, name, value] = line;
      const token = tokens.get(name) ?? { name, light: "" };
      if (block[1].startsWith(":root")) token.light = value.trim();
      else token.dark = value.trim();
      tokens.set(name, token);
    }
  }
  return [...tokens.values()].filter((token) => token.light);
}

/** The theme tokens a piece of source styles with, from its utility classes: `bg-primary`, `ring-ring/50`,
 *  `text-muted-foreground`, any `rounded` class for `radius`, and a bare `border` for `border`. */
export function readTokens(source: string, names: string[]) {
  const used = new Set<string>();
  const prefix =
    "(?:bg|text|border(?:-[trblxyse])?|ring|outline|fill|stroke|divide|placeholder|caret|from|via|to|shadow|decoration)";
  for (const name of names) {
    const pattern = new RegExp(`(?<![\\w-])${prefix}-${name}(?![\\w-])`);
    if (pattern.test(source)) used.add(name);
  }
  if (names.includes("radius") && /(?<![\w-])rounded(?![\w])/.test(source)) used.add("radius");
  if (names.includes("border") && /(?<![\w-])border(?:-[trblxyse])?(?![\w-])/.test(source)) used.add("border");
  return names.filter((name) => used.has(name));
}

/** The element a primitive's own `className` reaches, named by its data-slot, and whether the function takes a
 *  `variant` prop. A Look edit styles that element, and its exported wrapper passes classes the same way, so both
 *  agree. Undefined when the function passes no className on, as Radix roots and providers do. */
export function readRoot(source: string, name: string) {
  const code = blank(source);
  const match = new RegExp(`^(?:export\\s+)?function\\s+${name}\\b`, "m").exec(code);
  if (!match) return undefined;
  const params = code.indexOf("(", match.index);
  const paramsEnd = matching(code, params, "()");
  const end = closing(code, code.indexOf("{", paramsEnd));
  // The first use of className as a value, as in cn("...", className) or className={className}. A component with
  // branches, such as Sidebar, styles its first one, which is the one its sample renders.
  const use = /\bclassName\b(?!\s*=)/.exec(code.slice(paramsEnd, end));
  if (use?.index === undefined) return undefined;
  const at = paramsEnd + use.index;
  const tag = [...code.slice(0, at).matchAll(/<[A-Za-z]/g)].pop()?.index;
  if (tag === undefined) return undefined;
  const next = code.slice(at).search(/<[A-Za-z/]/);
  const element = source.slice(tag, next === -1 ? end : at + next);
  const slot = /data-slot="([\w-]+)"/.exec(element)?.[1];
  if (!slot) return undefined;
  return { slot, variant: /\bvariant\b/.test(code.slice(params, paramsEnd)) };
}

/** An exported function's lines, from `export function <name>` to its closing brace, with the 1-based line it starts
 *  on, so a patch can change them in place. */
export function readBlock(source: string, name: string) {
  const code = blank(source);
  const match = new RegExp(`^export\\s+function\\s+${name}\\b`, "m").exec(code);
  if (!match) return undefined;
  const params = code.indexOf("(", match.index);
  const open = code.indexOf("{", matching(code, params, "()"));
  const end = closing(code, open);
  const start = source.slice(0, match.index).split("\n").length;
  return { start, lines: source.slice(match.index, end).split("\n") };
}
