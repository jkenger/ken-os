import assert from "node:assert/strict";
import { test } from "node:test";
import { collectCopy, findViolations } from "./app-language-scan";

test("screen copy follows the app language rule", () => {
  assert.deepEqual(
    findViolations().map(
      (violation) => `${violation.file}: ${JSON.stringify(violation.text)} (${violation.rules.join(", ")})`,
    ),
    [],
    "App language violations. Rewrite them per docs/product/app-language.md.",
  );
});

test("the scan reads screen text and skips code values", () => {
  const { copy, headings } = collectCopy(
    "components/example.tsx",
    `
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
  `,
  );
  assert.deepEqual(
    copy.map((item) => item.text),
    ["Work log", "Decision", "Saved", ".", "Search…", "Couldn't save. Try again"],
  );
  assert.deepEqual(headings, ["Saved {}."]);
});
