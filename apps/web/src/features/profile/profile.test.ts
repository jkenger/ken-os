import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProfile, mergeImport, normalizeProfile, ProfileFieldError, PROFILE_LIMITS } from "@ken-os/domain";

test("save trims, drops empty entries and missing keys become empty", () => {
  const details = normalizeProfile({
    contact: { fullName: "  Ken  ", links: [{ label: "GitHub", url: "github.com/ken" }, { label: "blank", url: "" }] },
    experience: [{ company: "Acme", title: "Engineer", start: "2023-04", end: "", bullets: ["Shipped it", "", "  "] }, { company: "", title: "" }],
    skills: [{ name: "Languages", items: ["TypeScript", " ", "Go"] }, { name: "Empty", items: [] }],
    unknown: "dropped",
  }, "save");
  assert.equal(details.contact.fullName, "Ken");
  assert.deepEqual(details.contact.links, [{ label: "GitHub", url: "https://github.com/ken" }], "a bare domain gets https and an empty link goes");
  assert.equal(details.experience.length, 1, "an empty role is dropped");
  assert.deepEqual(details.experience[0].bullets, ["Shipped it"], "blank lines from the textarea are dropped");
  assert.deepEqual(details.skills, [{ name: "Languages", items: ["TypeScript", "Go"] }]);
  assert.equal(details.local.enabled, false);
  assert.equal("unknown" in details, false);
});

test("save names the field that's wrong; import cleans it instead", () => {
  const long = "x".repeat(PROFILE_LIMITS.text + 1);
  assert.throws(() => normalizeProfile({ contact: { headline: long } }, "save"), (error: Error) => error instanceof ProfileFieldError && /Headline is too long/.test(error.message));
  assert.throws(() => normalizeProfile({ experience: [{ title: "Dev", start: "April 2023" }] }, "save"), /Start: use a month like 2024-03/);
  assert.throws(() => normalizeProfile({ contact: { links: [{ label: "x", url: "javascript:alert(1)" }] } }, "save"), /Link: use a web address/);
  assert.throws(() => normalizeProfile({ experience: Array.from({ length: PROFILE_LIMITS.entries + 1 }, () => ({ title: "Dev" })) }, "save"), /up to 30 entries/);

  const imported = normalizeProfile({ contact: { headline: long }, experience: [{ title: "Dev", start: "April 2023", end: "2024" }] }, "import");
  assert.equal(imported.contact.headline.length, PROFILE_LIMITS.text, "import cuts overlong text");
  assert.equal(imported.experience[0].start, "", "import drops a date it can't read");
  assert.equal(imported.experience[0].end, "2024", "a year alone is fine");
});

test("an import fills from the file but never wipes what the file left out", () => {
  const saved = normalizeProfile({
    contact: { fullName: "Ken", email: "ken@example.com", phone: "+63 900" },
    summary: "Saved summary",
    education: [{ school: "UP", degree: "BS" }],
    local: { enabled: true, civilStatus: "Single" },
  }, "save");
  const draft = normalizeProfile({
    contact: { fullName: "Ken G", email: "", city: "Manila" },
    experience: [{ company: "Acme", title: "Engineer" }],
    local: { civilStatus: "Married", nationality: "Filipino" },
  }, "import");
  const merged = mergeImport(saved, draft);
  assert.equal(merged.contact.fullName, "Ken G", "the file wins where it has a value");
  assert.equal(merged.contact.email, "ken@example.com", "an empty field in the file keeps the saved one");
  assert.equal(merged.contact.phone, "+63 900");
  assert.equal(merged.contact.city, "Manila");
  assert.equal(merged.summary, "Saved summary");
  assert.equal(merged.experience[0].company, "Acme");
  assert.equal(merged.education[0].school, "UP", "a section the file lacks is kept");
  assert.equal(merged.local.enabled, true, "showing local fields stays the owner's choice");
  assert.equal(merged.local.civilStatus, "Single", "local fields the owner typed are kept");
  assert.equal(merged.local.nationality, "Filipino", "and gaps are filled from the file");
});

test("an empty Profile round-trips through save", () => {
  assert.deepEqual(normalizeProfile(emptyProfile(), "save"), emptyProfile());
});
