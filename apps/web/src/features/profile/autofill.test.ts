import assert from "node:assert/strict";
import { test } from "node:test";
import { applyAutofill, autofillChanges, normalizeProfile } from "@ken-os/domain";

const current = normalizeProfile(
  {
    contact: { fullName: "Ken Gervacio", headline: "Full-stack Engineer", city: "Binangonan" },
    summary: "Sample",
    projects: [{ name: "Loots", description: "Workspace app" }],
  },
  "save",
);

const draft = normalizeProfile(
  {
    contact: {
      fullName: "Ken Gervacio",
      headline: "Full-stack Engineer, applied AI",
      city: "",
      links: [{ label: "LinkedIn", url: "https://linkedin.com/in/ken" }],
    },
    projects: [{ name: "Loots", description: "Workspace app" }],
    skills: [{ name: "Stack", items: ["TypeScript", "React"] }],
    local: { nationality: "Filipino" },
  },
  "import",
);

test("only fields the file fills and that differ are changes, in form order", () => {
  const { changes, matches } = autofillChanges(current, draft);
  assert.deepEqual(
    changes.map(({ id, section }) => [id, section]),
    [
      ["contact.headline", "Contact"],
      ["contact.links", "Contact"],
      ["skills", "Skills"],
      ["local.nationality", "Local fields"],
    ],
  );
  assert.deepEqual(changes[0].before, ["Full-stack Engineer"]);
  assert.deepEqual(changes[0].after, ["Full-stack Engineer, applied AI"]);
  assert.deepEqual(changes[1].before, [], "nothing there yet");
  assert.deepEqual(changes[2].after, ["Stack: TypeScript, React"]);
  assert.deepEqual(matches, ["Projects"], "a filled section with no change is a match; Contact has changes");
});

test("accepting one change copies only that value", () => {
  const next = applyAutofill(current, draft, "contact.headline");
  assert.equal(next.contact.headline, "Full-stack Engineer, applied AI");
  assert.equal(next.contact.city, "Binangonan", "the file's empty city leaves it alone");
  assert.equal(next.summary, "Sample");
  assert.deepEqual(next.skills, []);
  assert.equal(current.contact.headline, "Full-stack Engineer", "the current form is not changed in place");

  const skills = applyAutofill(current, draft, "skills");
  assert.deepEqual(skills.skills, draft.skills);
  skills.skills[0].items.push("Go");
  assert.deepEqual(draft.skills[0].items, ["TypeScript", "React"], "the draft is copied, not shared");
});

test("accepting a local field turns local fields on", () => {
  const next = applyAutofill(current, draft, "local.nationality");
  assert.equal(next.local.nationality, "Filipino");
  assert.equal(next.local.enabled, true);
});

test("no changes when the file holds what is there", () => {
  assert.deepEqual(autofillChanges(current, current).changes, []);
});
