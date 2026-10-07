import assert from "node:assert/strict";
import { test } from "node:test";
import { loadDesignTokens, resolveColor } from "./design-tokens";

const tokens = loadDesignTokens();

function luminance(hex: string) {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test("the snapshot carries a version and status", () => {
  assert.match(tokens.meta.version, /^\d+\.\d+\.\d+/);
  assert.ok(["working", "approved"].includes(tokens.meta.status), `status is ${tokens.meta.status}`);
});

test("text colours keep 4.5:1 on every Ken OS surface", () => {
  const value = (name: string) => resolveColor(tokens, name);
  const surfaces = ["background", "canvas", "card", "muted", "secondary", "accent", "sidebar", "sidebar-accent", "tint", "table-head", "row-hover"];
  const texts = ["foreground", "muted-foreground", "quiet", "secondary-foreground", "sidebar-foreground", "sidebar-accent-foreground", "primary"];
  for (const text of texts) {
    for (const surface of surfaces) {
      const ratio = contrast(value(text), value(surface));
      assert.ok(ratio >= 4.5, `${text} on ${surface} is ${ratio.toFixed(2)}:1`);
    }
  }
  assert.ok(contrast(value("primary-foreground"), value("primary")) >= 4.5, "text on the primary action");
  for (const status of ["solid", "partial", "gap"]) {
    assert.ok(contrast(value(`status-${status}`), value(`status-${status}-surface`)) >= 4.5, `${status} on its tint`);
    assert.ok(contrast(value(`status-${status}`), value("background")) >= 4.5, `${status} on the ground`);
  }
});

test("focus and control edges keep 3:1", () => {
  const value = (name: string) => resolveColor(tokens, name);
  for (const surface of ["background", "canvas", "card"]) {
    assert.ok(contrast(value("ring"), value(surface)) >= 3, `focus ring on ${surface}`);
    assert.ok(contrast(value("input"), value(surface)) >= 3, `input edge on ${surface}`);
  }
});
