import assert from "node:assert/strict";
import test from "node:test";
import { readBlock, readExports, readSlot, readTheme, readTokens, readUses, readVariants, readWraps } from "./source";

test("readExports lists functions, consts and export lists, without types", () => {
  const source = `
export function Button() {}
export const buttonVariants = cva("");
type Props = {};
export type { Props };
// export function Commented() {}
const label = "export function InString() {}";
export { Card, CardHeader as Header, type CardProps };
`;
  assert.deepEqual(readExports(source), ["Button", "buttonVariants", "Card", "Header"]);
});

test("readVariants reads cva groups, options and defaults, merged across calls", () => {
  const source = `
const buttonVariants = cva("inline-flex {not-a-brace}", {
  variants: {
    variant: {
      default: "bg-primary",
      "ghost-soft": cn("a", { b: true }),
    },
    size: { sm: "h-8", lg: "h-10" },
  },
  defaultVariants: { variant: "default", size: "sm" },
});
const other = cva(["x"], { variants: { variant: { link: "underline" } } });
`;
  assert.deepEqual(readVariants(source), [
    { name: "variant", options: ["default", "ghost-soft", "link"], defaultOption: "default" },
    { name: "size", options: ["sm", "lg"], defaultOption: "sm" },
  ]);
});

test("readVariants is empty without cva", () => {
  assert.deepEqual(readVariants("export function Card() { return <div />; }"), []);
});

test("readWraps names the one primitive a function renders", () => {
  const source = `
import { Badge as ShadcnBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function Badge({ children }: { children: ReactNode }) {
  return <ShadcnBadge variant="secondary">{children}</ShadcnBadge>;
}
export function Plain() {
  return <div>{"<Button>"}</div>;
}
export function Both() {
  return <Card><Button /></Card>;
}
`;
  assert.deepEqual(readWraps(source), { Badge: "badge" });
});

test("readUses lists the primitives a file imports, once each", () => {
  const source = `
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
} from "@/components/ui/tooltip"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
`;
  assert.deepEqual(readUses(source), ["button", "tooltip"]);
});

test("readTheme reads :root and .dark, with later blocks winning", () => {
  const css = `
:root {
  --radius: 0.625rem;
  --primary: oklch(0.2 0 0);
}
.dark {
  --primary: oklch(0.9 0 0);
}
@theme inline { --color-primary: var(--primary); }
:root {
  --selected: var(--topic-active);
  --primary: oklch(0.3 0 0);
}
`;
  assert.deepEqual(readTheme(css), [
    { name: "radius", light: "0.625rem" },
    { name: "primary", light: "oklch(0.3 0 0)", dark: "oklch(0.9 0 0)" },
    { name: "selected", light: "var(--topic-active)" },
  ]);
});

test("readTokens finds tokens in utility classes, radius from rounded and border from a bare border", () => {
  const names = ["primary", "primary-foreground", "ring", "border", "radius", "muted"];
  const source = `cva("rounded-lg border bg-primary/90 text-primary-foreground focus-visible:ring-ring/50")`;
  assert.deepEqual(readTokens(source, names), ["primary", "primary-foreground", "ring", "border", "radius"]);
  assert.deepEqual(readTokens(`"text-primary-foreground border-input"`, names), ["primary-foreground"]);
});

test("readSlot and readBlock find the root slot and a function's own lines", () => {
  assert.equal(readSlot(`<div data-slot="card" /><div data-slot="card-title" />`), "card");
  const source = `import x from "y";

/** Doc. */
export function Badge({ children }: { children: ReactNode }) {
  return <ShadcnBadge variant="secondary">{children}</ShadcnBadge>;
}

export function Back() {}
`;
  assert.deepEqual(readBlock(source, "Badge"), {
    start: 4,
    lines: [
      "export function Badge({ children }: { children: ReactNode }) {",
      '  return <ShadcnBadge variant="secondary">{children}</ShadcnBadge>;',
      "}",
    ],
  });
  assert.equal(readBlock(source, "Missing"), undefined);
});
