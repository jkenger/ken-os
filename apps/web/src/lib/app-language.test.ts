import assert from "node:assert/strict";
import { test } from "node:test";
import { appLanguageAllowlist } from "./app-language-allowlist";
import { collectCopy, findViolations } from "./app-language-scan";

const key = (entry: { file: string; text: string }) => `${entry.file}: ${JSON.stringify(entry.text)}`;

test("screen copy follows the app language rule", () => {
  const violations = findViolations();
  const allowed = new Set(appLanguageAllowlist.map(key));
  const found = new Set(violations.map(key));

  const added = violations.filter((violation) => !allowed.has(key(violation)));
  assert.deepEqual(
    added.map((violation) => `${key(violation)} (${violation.rules.join(", ")})`),
    [],
    "New app language violations. Rewrite them per docs/product/app-language.md; don't add them to the allowlist.",
  );

  const stale = appLanguageAllowlist.filter((entry) => !found.has(key(entry)));
  assert.deepEqual(stale.map(key), [], "Fixed entries are still in app-language-allowlist.ts. Delete them.");
});

test("the scan reads screen text and skips code values", () => {
  const { copy, headings } = collectCopy("components/example.tsx", `
    import { x } from "some/path...";
    type Kind = "receipt" | "decision";
    export function Example({ kind }: { kind: Kind }) {
      const label = kind === "receipt" ? "Work log" : "Decision";
      return <section className="mt-2 text-sm" aria-labelledby="title">
        <h2 id="title">Saved {label}.</h2>
        <input placeholder="Search…" type="text" />
        <p>Couldn't save. Try again</p>
      </section>;
    }
  `);
  assert.deepEqual(copy.map((item) => item.text), ["Work log", "Decision", "Saved", ".", "Search…", "Couldn't save. Try again"]);
  assert.deepEqual(headings, ["Saved {}."]);
});
