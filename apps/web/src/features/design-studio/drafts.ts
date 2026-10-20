import type { StudioComponent, StudioManifest, ThemeToken } from "./manifest";

// The Design Studio's drafts (docs/architecture/design-studio.md, "Edits and export"): what a Look or Tokens edit
// stores, how it re-renders the canvas at once, and how Export turns it into a patch. The design system's rules decide
// what an edit can be: a token edit is an override in the Loots section of globals.css, and a component edit is a Loots
// wrapper, never a change to components/ui.

/** A token edit: the new `:root` value, the new `.dark` value, or both. */
export type TokenChange = { light?: string; dark?: string };

/** The parts of a component a Look edit can restyle (mockup frames D3 and D6). */
export const lookProps = [
  "variant",
  "radius",
  "height",
  "padding",
  "gap",
  "weight",
  "background",
  "text",
  "border",
] as const;
export type LookProp = (typeof lookProps)[number];

/** A Look edit. `variant` is the variant a wrapper passes to its primitive; `scope` limits a primitive's edit to one
 *  of its variants. `from` keeps each part's value before the edit, for Export's "500 → 600". */
export type LookChange = Partial<Record<LookProp, string>> & {
  scope?: string;
  from?: Partial<Record<LookProp, string>>;
};

export type Draft =
  | { kind: "token"; target: string; change: TokenChange; updatedAt?: string }
  | { kind: "component"; target: string; change: LookChange; updatedAt?: string };

export const draftKey = (draft: Pick<Draft, "kind" | "target">) => `${draft.kind}:${draft.target}`;

/** The radius scale from globals.css, as multiples of `--radius`. */
export const radiusScale: Record<string, number> = {
  sm: 0.6,
  md: 0.8,
  lg: 1,
  xl: 1.4,
  "2xl": 1.8,
  "3xl": 2.2,
  "4xl": 2.6,
};

export const fontWeights: Record<string, string> = {
  "400": "font-normal",
  "500": "font-medium",
  "600": "font-semibold",
  "700": "font-bold",
};

/** A CSS value a token can take: numbers, units, oklch(), var(), with no characters that could end a declaration. */
const cssValue = /^[a-z0-9 .%()/,+-]{1,60}$/i;
const slug = /^[a-z0-9-]{1,40}$/;
const pixels = /^\d{1,3}$/;

export function isTokenValue(value: string) {
  return cssValue.test(value) && !/url\s*\(/i.test(value);
}

/** Checks a draft from the browser against the manifest: a known token or component, and only values the canvas and
 *  the patch can use. Returns the draft trimmed to its known fields, or an error. */
export function parseDraft(
  input: unknown,
  manifest: Pick<StudioManifest, "components" | "theme">,
): { draft: Draft } | { error: string } {
  if (!input || typeof input !== "object") return { error: "Invalid draft" };
  const { kind, target, change } = input as Record<string, unknown>;
  if (typeof target !== "string" || !change || typeof change !== "object") return { error: "Invalid draft" };
  const fields = change as Record<string, unknown>;
  if (kind === "token") {
    if (!manifest.theme.some((token) => token.name === target)) return { error: "Unknown token" };
    const out: TokenChange = {};
    for (const side of ["light", "dark"] as const) {
      const value = fields[side];
      if (value === undefined) continue;
      if (typeof value !== "string" || !isTokenValue(value.trim())) return { error: `Invalid ${side} value` };
      out[side] = value.trim();
    }
    return { draft: { kind, target, change: out } };
  }
  if (kind === "component") {
    const component = manifest.components.find((item) => item.id === target);
    if (!component) return { error: "Unknown component" };
    const tokens = new Set(manifest.theme.map((token) => token.name));
    const valid: Record<LookProp | "scope", (value: string) => boolean> = {
      variant: (value) => slug.test(value),
      scope: (value) => slug.test(value),
      radius: (value) => value in radiusScale || value === "full" || value === "none",
      height: (value) => pixels.test(value),
      padding: (value) => pixels.test(value),
      gap: (value) => pixels.test(value),
      weight: (value) => value in fontWeights,
      background: (value) => tokens.has(value) || value === "transparent",
      text: (value) => tokens.has(value),
      border: (value) => tokens.has(value) || value === "transparent",
    };
    const out: LookChange = {};
    for (const key of [...lookProps, "scope"] as const) {
      const value = fields[key];
      if (value === undefined) continue;
      if (typeof value !== "string" || !valid[key](value)) return { error: `Invalid ${key}` };
      out[key] = value;
    }
    const from = fields.from;
    if (from && typeof from === "object") {
      out.from = {};
      for (const key of lookProps) {
        const value = (from as Record<string, unknown>)[key];
        if (typeof value === "string" && /^[\w .#%·-]{0,40}$/.test(value)) out.from[key] = value;
      }
    }
    return { draft: { kind, target, change: out } };
  }
  return { error: "Invalid draft" };
}

/** True when a draft changes nothing, so saving it removes it instead. */
export function isEmptyDraft(draft: Draft) {
  if (draft.kind === "token") return !draft.change.light && !draft.change.dark;
  return lookProps.every((key) => !draft.change[key]);
}

/** The CSS that shows the drafts on every live preview at once (mockup frame F): token overrides on each preview
 *  surface, light and dark apart, then each component's Look on its root element inside its own node. Previews mark
 *  their surface with `data-studio-preview="<id>"`. Values are checked again here, since they go into a style tag. */
export function draftStyles(drafts: Draft[], components: StudioComponent[]) {
  const light: string[] = [];
  const dark: string[] = [];
  const rules: string[] = [];
  for (const draft of drafts) {
    if (draft.kind !== "token" || !/^[\w-]+$/.test(draft.target)) continue;
    const { light: l, dark: d } = draft.change;
    if (l && isTokenValue(l)) light.push(`--${draft.target}: ${l};`);
    if (d && isTokenValue(d)) dark.push(`--${draft.target}: ${d};`);
    // A token with no dark value, such as radius, is the same in both.
    else if (l && isTokenValue(l) && draft.target === "radius") dark.push(`--${draft.target}: ${l};`);
  }
  if (light.length) rules.push(`[data-studio-preview]:not(.dark, .dark *) { ${light.join(" ")} }`);
  if (dark.length) rules.push(`[data-studio-preview].dark, .dark [data-studio-preview] { ${dark.join(" ")} }`);
  for (const draft of drafts) {
    if (draft.kind !== "component") continue;
    const component = components.find((item) => item.id === draft.target);
    const slot = component && rootSlot(component, components);
    const css = lookCss(draft.change);
    if (!component || !slot || !css) continue;
    const scope = draft.change.scope ? `[data-variant="${draft.change.scope}"]` : "";
    rules.push(`[data-studio-preview="${component.id}"] [data-slot="${slot}"]${scope} { ${css} }`);
  }
  return rules.join("\n");
}

/** The element a Look edit styles: a primitive's root slot, or for a wrapper the root slot of what it wraps. */
export function rootSlot(component: StudioComponent, components: StudioComponent[]) {
  if (component.kind === "primitive") return component.slot;
  return components.find((item) => item.id === component.wraps)?.slot;
}

/** Whether the Look tab can restyle a component: a primitive with a root slot, or a wrapper built on one whose own
 *  code passes it classes. */
export function canRestyle(component: StudioComponent, components: StudioComponent[]) {
  if (!rootSlot(component, components)) return false;
  return component.kind === "primitive" || Boolean(component.source?.lines.some((line) => line.includes('cn("')));
}

/** A wrapper's `variant="..."` prop on its primitive, which D6's Variant control changes. */
export function wrapperVariant(component: StudioComponent) {
  for (const line of component.source?.lines ?? []) {
    const match = /\bvariant="([\w-]+)"/.exec(line);
    if (match) return match[1];
  }
  return undefined;
}

const radiusCss = (value: string) =>
  value === "full" ? "9999px" : value === "none" ? "0" : `calc(var(--radius) * ${radiusScale[value]})`;

function lookCss(change: LookChange) {
  const css: string[] = [];
  if (change.radius && (change.radius in radiusScale || change.radius === "full" || change.radius === "none"))
    css.push(`border-radius: ${radiusCss(change.radius)};`);
  if (change.height && pixels.test(change.height)) css.push(`height: ${change.height}px;`);
  if (change.padding && pixels.test(change.padding)) css.push(`padding-inline: ${change.padding}px;`);
  if (change.gap && pixels.test(change.gap)) css.push(`gap: ${change.gap}px;`);
  if (change.weight && change.weight in fontWeights) css.push(`font-weight: ${change.weight};`);
  const color = (value: string) => (value === "transparent" ? "transparent" : `var(--${value})`);
  if (change.background && /^[\w-]+$/.test(change.background))
    css.push(`background-color: ${color(change.background)};`);
  if (change.text && /^[\w-]+$/.test(change.text)) css.push(`color: ${color(change.text)};`);
  if (change.border && /^[\w-]+$/.test(change.border)) css.push(`border-color: ${color(change.border)};`);
  return css.join(" ");
}

/** "36" -> "h-9", "13" -> "h-[13px]": Tailwind's spacing scale where it lands on it. */
const spacing = (prefix: string, px: string) => {
  const steps = Number(px) / 4;
  return Number.isInteger(steps * 2) ? `${prefix}-${steps}` : `${prefix}-[${px}px]`;
};

/** A Look edit as the Tailwind classes its wrapper adds. */
export function lookClasses(change: LookChange) {
  const classes: string[] = [];
  if (change.radius) classes.push(`rounded-${change.radius}`);
  if (change.height) classes.push(spacing("h", change.height));
  if (change.padding) classes.push(spacing("px", change.padding));
  if (change.gap) classes.push(spacing("gap", change.gap));
  if (change.weight && fontWeights[change.weight]) classes.push(fontWeights[change.weight]);
  if (change.background) classes.push(`bg-${change.background}`);
  if (change.text) classes.push(`text-${change.text}`);
  if (change.border) classes.push(`border-${change.border}`);
  return classes.join(" ");
}

const lookLabels: Record<LookProp, string> = {
  variant: "Variant",
  radius: "Radius",
  height: "Height",
  padding: "Padding",
  gap: "Gap",
  weight: "Font weight",
  background: "Background",
  text: "Text",
  border: "Border",
};

/** A token's value as the inspector shows it: the three oklch numbers without the `oklch()` around them. */
export const shortValue = (value = "") => /^oklch\((.*)\)$/.exec(value)?.[1] ?? value;

/** What a draft changes, in a few words, for the Export list (mockup frame E1). */
export function describeDraft(draft: Draft, theme: ThemeToken[]) {
  if (draft.kind === "token") {
    const token = theme.find((item) => item.name === draft.target);
    const parts: string[] = [];
    const { light, dark } = draft.change;
    const step = (from = "", to = "") => `${shortValue(from)} → ${shortValue(to)}`;
    if (light && dark) parts.push(`Light ${step(token?.light, light)}`, `dark ${step(token?.dark, dark)}`);
    else if (light) parts.push(step(token?.light, light));
    else if (dark) parts.push(`Dark ${step(token?.dark, dark)}`);
    return parts.join(", ");
  }
  const unit = (key: LookProp, value: string) => (["height", "padding", "gap"].includes(key) ? `${value}px` : value);
  return lookProps
    .filter((key) => draft.change[key])
    .map((key) => {
      const to = unit(key, draft.change[key]!);
      const from = draft.change.from?.[key];
      return from ? `${lookLabels[key]} ${from} → ${to}` : `${lookLabels[key]} ${to}`;
    })
    .join(", ");
}

/** The file a primitive's Look edit becomes: a Loots wrapper beside, never inside, components/ui. */
export const wrapperFile = (component: StudioComponent) =>
  `components/loots/${component.file.replace(/^components\/ui\//, "")}`;

type FilePatch = { path: string; hunks: string[]; created?: boolean };

function tokenPatch(drafts: Extract<Draft, { kind: "token" }>[], manifest: StudioManifest): FilePatch | undefined {
  const light = drafts.filter((draft) => draft.change.light);
  const dark = drafts.filter((draft) => draft.change.dark);
  if (!light.length && !dark.length) return undefined;
  const added = ["", "/* Design Studio: token overrides */"];
  if (light.length) added.push(":root {", ...light.map((draft) => `  --${draft.target}: ${draft.change.light};`), "}");
  if (dark.length) added.push(".dark {", ...dark.map((draft) => `  --${draft.target}: ${draft.change.dark};`), "}");
  const { lines, tail, newline } = manifest.globals;
  const start = lines - tail.length + 1;
  // A file that ends without a newline gets one before the overrides, which changes its last line.
  const last = tail[tail.length - 1];
  const context = newline
    ? tail.map((line) => ` ${line}`)
    : [...tail.slice(0, -1).map((line) => ` ${line}`), `-${last}`, "\\ No newline at end of file", `+${last}`];
  const hunk = [
    `@@ -${start},${tail.length} +${start},${tail.length + added.length} @@`,
    ...context,
    ...added.map((line) => `+${line}`),
  ].join("\n");
  return { path: `apps/web/src/${manifest.globals.file}`, hunks: [hunk] };
}

function primitivePatch(component: StudioComponent, change: LookChange): FilePatch {
  const name = component.exports[0] ?? component.name;
  const base = `Shadcn${name}`;
  const classes = JSON.stringify(lookClasses(change));
  const defaultScope = component.variants.find((group) => group.name === "variant")?.defaultOption;
  const condition = change.scope
    ? change.scope === defaultScope
      ? `(props.variant ?? ${JSON.stringify(defaultScope)}) === ${JSON.stringify(change.scope)} && ${classes}`
      : `props.variant === ${JSON.stringify(change.scope)} && ${classes}`
    : classes;
  const lines = [
    'import type { ComponentProps } from "react";',
    `import { ${name} as ${base} } from "@/${component.file.replace(/\.tsx$/, "")}";`,
    'import { cn } from "@/lib/utils";',
    "",
    `/** ${name} with the Design Studio's Look edits. */`,
    `export function ${name}({ className, ...props }: ComponentProps<typeof ${base}>) {`,
    `  return <${base} className={cn(${condition}, className)} {...props} />;`,
    "}",
  ];
  return {
    path: `apps/web/src/${wrapperFile(component)}`,
    created: true,
    hunks: [[`@@ -0,0 +1,${lines.length} @@`, ...lines.map((line) => `+${line}`)].join("\n")],
  };
}

/** A wrapper's Look edit, applied to its own lines: the variant it passes, and classes added to its first cn(). */
function wrapperHunk(component: StudioComponent, change: LookChange) {
  if (!component.source) return undefined;
  const classes = lookClasses({ ...change, variant: undefined });
  let variantDone = !change.variant;
  let classesDone = !classes;
  const next = component.source.lines.map((line) => {
    let out = line;
    if (!variantDone && /\bvariant="[\w-]+"/.test(out)) {
      out = out.replace(/\bvariant="[\w-]+"/, `variant="${change.variant}"`);
      variantDone = true;
    }
    if (!classesDone && out.includes('cn("')) {
      out = out.replace(
        /cn\("([^"]*)"/,
        (_, existing: string) => `cn("${[existing, classes].filter(Boolean).join(" ")}"`,
      );
      classesDone = true;
    }
    return out;
  });
  const { start, lines } = component.source;
  if (next.every((line, index) => line === lines[index])) return undefined;
  const body = lines.flatMap((line, index) => (line === next[index] ? [` ${line}`] : [`-${line}`, `+${next[index]}`]));
  return { start, hunk: [`@@ -${start},${lines.length} +${start},${lines.length} @@`, ...body].join("\n") };
}

/** Every draft as one unified diff against the manifest's source (mockup frame E2), for `git apply` in a checkout. */
export function draftPatch(drafts: Draft[], manifest: StudioManifest) {
  const files: FilePatch[] = [];
  const tokens = tokenPatch(
    drafts.filter((draft): draft is Extract<Draft, { kind: "token" }> => draft.kind === "token"),
    manifest,
  );
  if (tokens) files.push(tokens);
  const wrapperHunks = new Map<string, { start: number; hunk: string }[]>();
  for (const draft of drafts) {
    if (draft.kind !== "component") continue;
    const component = manifest.components.find((item) => item.id === draft.target);
    if (!component) continue;
    if (component.kind === "primitive") {
      if (lookClasses(draft.change)) files.push(primitivePatch(component, draft.change));
      continue;
    }
    const hunk = wrapperHunk(component, draft.change);
    if (hunk) wrapperHunks.set(component.file, [...(wrapperHunks.get(component.file) ?? []), hunk]);
  }
  for (const [file, hunks] of wrapperHunks)
    files.push({
      path: `apps/web/src/${file}`,
      hunks: hunks.sort((a, b) => a.start - b.start).map((item) => item.hunk),
    });
  const text = files
    .map((file) =>
      [file.created ? "--- /dev/null" : `--- a/${file.path}`, `+++ b/${file.path}`, ...file.hunks].join("\n"),
    )
    .join("\n");
  return { text: text ? `${text}\n` : "", files: files.length };
}
