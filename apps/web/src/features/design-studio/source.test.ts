import assert from "node:assert/strict";
import test from "node:test";
import { readExports, readVariants, readWraps } from "./source";

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
