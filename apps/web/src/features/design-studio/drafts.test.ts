import assert from "node:assert/strict";
import test from "node:test";
import { canRestyle, describeDraft, draftPatch, draftStyles, lookClasses, parseDraft, type Draft } from "./drafts";
import { studioManifest } from "./manifest.generated";

const radius: Draft = { kind: "token", target: "radius", change: { light: "0.5rem" } };
const button: Draft = {
  kind: "component",
  target: "ui/button",
  change: { weight: "600", from: { weight: "500" } },
};
const kitBadge: Draft = {
  kind: "component",
  target: "kit/badge",
  change: { variant: "outline", from: { variant: "secondary" } },
};

test("parseDraft keeps known tokens and Look parts, and refuses values that could break out of CSS", () => {
  assert.deepEqual(parseDraft(radius, studioManifest), { draft: radius });
  assert.deepEqual(parseDraft({ ...button, change: { ...button.change, extra: "x" } }, studioManifest), {
    draft: button,
  });
  assert.deepEqual(
    parseDraft({ kind: "token", target: "radius", change: { light: "1rem; } body { x: y" } }, studioManifest),
    {
      error: "Invalid light value",
    },
  );
  assert.deepEqual(parseDraft({ kind: "token", target: "nope", change: {} }, studioManifest), {
    error: "Unknown token",
  });
  assert.deepEqual(parseDraft({ kind: "component", target: "ui/button", change: { weight: "650" } }, studioManifest), {
    error: "Invalid weight",
  });
  assert.deepEqual(parseDraft({ kind: "component", target: "ui/tabs", change: { scope: "line" } }, studioManifest), {
    error: "Invalid scope",
  });
  assert.deepEqual(parseDraft({ kind: "component", target: "ui/nope", change: {} }, studioManifest), {
    error: "Unknown component",
  });
});

test("describeDraft says what changed in a few words (E1)", () => {
  assert.equal(describeDraft(radius, studioManifest.theme), "0.375rem → 0.5rem");
  assert.equal(describeDraft(button, studioManifest.theme), "Font weight 500 → 600");
  assert.equal(describeDraft(kitBadge, studioManifest.theme), "Variant secondary → outline");
});

test("draftStyles overrides tokens on previews only, light and dark apart, and scopes a Look to its node", () => {
  const css = draftStyles(
    [radius, { kind: "token", target: "primary", change: { dark: "oklch(0.8 0 0)" } }, button],
    studioManifest.components,
    studioManifest.theme,
  );
  assert.match(css, /\[data-studio-preview\]:is\(\.light, \.light \*\) \{ --radius: 0\.5rem; \}/);
  assert.match(
    css,
    /\[data-studio-preview\]:is\(\.dark, \.dark \*\):not\(\.light \*\) \{ --radius: 0\.5rem; --primary: oklch\(0\.8 0 0\); \}/,
  );
  assert.match(css, /\[data-studio-preview="ui\/button"\] \[data-slot="button"\] \{ font-weight: 600; \}/);
});

test("draftStyles declares aliases again on previews, and scopes a Look by the variant its preview shows", () => {
  const css = draftStyles(
    [
      { kind: "token", target: "ring", change: { light: "oklch(0.2 0.02 250)" } },
      { kind: "component", target: "ui/alert", change: { scope: "destructive", weight: "600" } },
    ],
    studioManifest.components,
    studioManifest.theme,
  );
  assert.match(css, /--ring: oklch\(0\.2 0\.02 250\); --selected: var\(--ring\);/);
  assert.match(css, /\[data-studio-preview="ui\/alert"\]\[data-studio-variant="destructive"\] \[data-slot="alert"\]/);
});

test("lookClasses writes Tailwind classes, on the spacing scale where it can", () => {
  assert.equal(
    lookClasses({ radius: "lg", height: "36", padding: "13", gap: "6", weight: "600", background: "primary" }),
    "rounded-lg h-9 px-[13px] gap-1.5 font-semibold bg-primary",
  );
});

test("canRestyle allows primitives with a root slot and wrappers that pass classes", () => {
  const find = (id: string) => studioManifest.components.find((item) => item.id === id)!;
  assert.equal(canRestyle(find("ui/button"), studioManifest.components), true);
  assert.equal(canRestyle(find("kit/badge"), studioManifest.components), true);
  assert.equal(canRestyle(find("kit/rail"), studioManifest.components), false);
  // Dialog's first export is a Radix root, which takes no className.
  assert.equal(canRestyle(find("ui/dialog"), studioManifest.components), false);
});

test("draftPatch appends token overrides to globals.css, adds a Loots wrapper and edits a wrapper in place", () => {
  const { text, files } = draftPatch([radius, button, kitBadge], studioManifest);
  assert.equal(files, 3);
  const { lines, tail } = studioManifest.globals;
  const start = lines - tail.length + 1;
  assert.ok(text.startsWith("--- a/apps/web/src/app/globals.css\n+++ b/apps/web/src/app/globals.css\n"));
  assert.ok(text.includes(`@@ -${start},3 +${start},9 @@\n ${tail[0]}`));
  assert.ok(text.includes("+:root,\n+.light {\n+  --radius: 0.5rem;\n+}\n"));
  assert.ok(text.includes("--- /dev/null\n+++ b/apps/web/src/components/loots/button.tsx\n@@ -0,0 +1,8 @@\n"));
  assert.ok(text.includes('+import { Button as ShadcnButton } from "@/components/ui/button";'));
  assert.ok(text.includes('+  return <ShadcnButton className={cn("font-semibold", className)} {...props} />;'));
  const badge = studioManifest.components.find((item) => item.id === "kit/badge")!;
  const line = badge.source!.lines.find((item) => item.includes('variant="secondary"'))!;
  assert.ok(text.includes(`-${line}\n+${line.replace("secondary", "outline")}`));
  assert.ok(text.endsWith("\n"));
});

test("draftPatch limits a scoped Look to its variant", () => {
  const { text } = draftPatch(
    [{ kind: "component", target: "ui/button", change: { scope: "outline", weight: "700" } }],
    studioManifest,
  );
  assert.ok(text.includes('cn(props.variant === "outline" && "font-bold", className)'));
});
