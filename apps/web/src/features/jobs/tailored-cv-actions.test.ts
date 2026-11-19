import assert from "node:assert/strict";
import { test } from "node:test";
import { TailoredCvActions } from "./tailored-cv-actions";

// Refactor-safety net for extracting `TailoredCvActions` out of `posting-detail.tsx`'s inline `ButtonGroup`
// (plans/job-card-actions.md, Slice 2): calling the component function directly returns the React element tree
// it builds, without rendering it -- this repo's test runner (tsx --test, Node's own `assert`) has no component
// rendering harness (no Vitest Browser Mode, no DOM, no React Testing Library), so a true before/after DOM
// snapshot isn't practical here; walking the element tree it would otherwise have to render is the next best
// thing, and it still proves the same props produce the same wiring.

type Node = { props?: Record<string, unknown> } | string | number | boolean | null | undefined | Node[];

function flattenProps(node: Node, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(node)) {
    for (const child of node) flattenProps(child, out);
    return out;
  }
  if (node && typeof node === "object" && "props" in node) {
    out.push(node.props ?? {});
    flattenProps((node.props as { children?: Node } | undefined)?.children, out);
  }
  return out;
}

function flattenText(node: Node, out: string[] = []): string[] {
  if (typeof node === "string") {
    out.push(node);
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) flattenText(child, out);
    return out;
  }
  if (node && typeof node === "object" && "props" in node) {
    flattenText((node.props as { children?: Node } | undefined)?.children, out);
  }
  return out;
}

test("TailoredCvActions links to the given posting's tailor route and wires Regenerate to the given handler", () => {
  const onRegenerateClick = () => {};
  const tree = TailoredCvActions({ postingId: "abc123", onRegenerateClick });
  const props = flattenProps(tree);

  const link = props.find((p) => typeof p.href === "string");
  assert.equal(link?.href, "/api/jobs/postings/abc123/tailor");
  assert.equal(link?.target, "_blank");
  assert.equal(link?.rel, "noopener noreferrer");

  const regenerateButton = props.find((p) => p["aria-label"] === "Regenerate tailored CV");
  assert.ok(regenerateButton, "expected a control labelled Regenerate tailored CV");
  assert.equal(regenerateButton?.onClick, onRegenerateClick);

  const text = flattenText(tree);
  assert.ok(text.includes("View tailored CV"), "expected the view link's own label");
});
