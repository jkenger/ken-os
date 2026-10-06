import assert from "node:assert/strict";
import { test } from "node:test";
import { designSystem } from "../features/design-system/contract";
import { designSkillFiles } from "../features/design-system/skill";
import { parseSkillBundle } from "./skill-bundle";
import { exportSkillZip } from "./skill-export";

test("working design skill round-trips as a complete Markdown ZIP", async () => {
  const files = designSkillFiles();
  const zip = await exportSkillZip("ken-os-design", files);
  const parsed = await parseSkillBundle("ken-os-design.zip", zip);
  assert.equal(parsed.slug, "ken-os-design");
  assert.deepEqual(parsed.files, files);
  assert.deepEqual(Object.keys(parsed.files).sort(), ["SKILL.md", "references/components.md", "references/foundations.md"]);
  for (const content of Object.values(parsed.files)) {
    assert.match(content, new RegExp(designSystem.version.replaceAll(".", "\\.")));
    assert.match(content, /not yet approved/);
  }
});

test("exported palette reflects the design contract", () => {
  const foundations = designSkillFiles()["references/foundations.md"];
  for (const color of designSystem.colors) {
    assert.ok(foundations.includes(color.value), `Missing ${color.variable}`);
  }
});

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

test("text colours keep 4.5:1 on every Ken OS surface", () => {
  const value = (name: string) => designSystem.colors.find((color) => color.variable === name)!.value;
  const surfaces = ["background", "card", "muted", "secondary", "accent", "sidebar", "sidebar-accent", "tint", "table-head", "row-hover"];
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
    assert.ok(contrast(value(`status-${status}`), value("background")) >= 4.5, `${status} on the canvas`);
  }
});
