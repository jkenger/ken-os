import assert from "node:assert/strict";
import { test } from "node:test";
import { applyRewrite, checkRewrite, normalizeProfile, rewriteTargets, textAt } from "@ken-os/domain";

const details = normalizeProfile(
  {
    summary: "",
    experience: [
      {
        company: "Northwind",
        title: "Senior Engineer",
        start: "2023-04",
        bullets: ["Did billing work on Stripe, failed payments went down 18%", "Worked on tests"],
      },
    ],
    projects: [{ name: "Ken OS", bullets: ["Made a workspace app"] }],
  },
  "save",
);

test("the summary and every bullet are targets, labelled by where they sit", () => {
  assert.deepEqual(
    rewriteTargets(details).map(({ id, place }) => [id, place]),
    [
      ["summary", "Summary"],
      ["experience.0.0", "Senior Engineer, Northwind"],
      ["experience.0.1", "Senior Engineer, Northwind"],
      ["projects.0.0", "Ken OS"],
    ],
  );
});

test("a suggestion lands on exactly its line", () => {
  const next = applyRewrite(details, "experience.0.1", "Added end-to-end tests to every pull request");
  assert.equal(textAt(next, "experience.0.1"), "Added end-to-end tests to every pull request");
  assert.equal(textAt(next, "experience.0.0"), details.experience[0].bullets[0], "its neighbour is untouched");
  assert.equal(textAt(details, "experience.0.1"), "Worked on tests", "the original isn't changed");
  assert.equal(applyRewrite(details, "summary", "Builds things").summary, "Builds things");
  assert.equal(textAt(details, "experience.3.0"), null, "a removed line has no text");
  assert.deepEqual(applyRewrite(details, "projects.0.9", "x"), details, "a line that's gone is left alone");
});

test("suggestions that invent numbers, repeat, or aim at unknown lines are dropped", () => {
  const kept = checkRewrite(details, [
    { id: "experience.0.0", after: "Rebuilt billing on Stripe, cutting failed payments by 18%", tip: "" },
    { id: "experience.0.1", after: "Added tests that caught 40% more bugs", tip: "" },
    {
      id: "experience.0.1",
      after: "Added end-to-end tests to the release flow",
      tip: "Add a number: how many releases",
    },
    { id: "experience.0.0", after: "A second take on the same line", tip: "" },
    { id: "projects.0.0", after: "Made a workspace app", tip: "" },
    { id: "experience.9.0", after: "Nothing here", tip: "" },
    { id: "summary", after: "  Senior engineer   who ships billing and testing work.  ", tip: "" },
  ]);
  assert.deepEqual(
    kept.map(({ id, after, tip }) => [id, after, tip]),
    [
      ["experience.0.0", "Rebuilt billing on Stripe, cutting failed payments by 18%", null],
      ["experience.0.1", "Added end-to-end tests to the release flow", "Add a number: how many releases"],
      ["summary", "Senior engineer who ships billing and testing work.", null],
    ],
  );
  assert.equal(kept[0].before, details.experience[0].bullets[0], "before is the line as it was");
  assert.equal(kept[2].before, "", "an empty summary can be written");
});

test("years from dates count as known numbers", () => {
  const [summary] = checkRewrite(details, [
    { id: "summary", after: "Senior engineer at Northwind since 2023.", tip: "" },
  ]);
  assert.equal(summary?.after, "Senior engineer at Northwind since 2023.");
});
