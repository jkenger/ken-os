import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProfile } from "@ken-os/domain";
import { parsePortfolioSnapshot } from "@ken-os/portfolio";
import { buildSnapshot } from "./snapshot";

function fullProfile() {
  const details = emptyProfile();
  details.contact = {
    fullName: "Ken Example",
    headline: "Full-stack engineer",
    email: "ken@example.test",
    phone: "+63 900 000 0000",
    city: "Manila",
    country: "Philippines",
    links: [{ label: "GitHub", url: "https://github.com/example" }],
  };
  details.summary = "Builds things";
  details.experience = [
    { company: "Acme", title: "Engineer", location: "Remote", start: "2024-01", end: "", bullets: ["Shipped it"] },
  ];
  details.education = [{ school: "UP", degree: "BS", field: "CS", start: "2016", end: "2020", notes: "GPA 1.2" }];
  details.local = {
    enabled: true,
    birthdate: "1999-01-01",
    civilStatus: "Single",
    nationality: "Filipino",
    address: "123 Private St",
    references: ["Jane, 0917 000 0000"],
  };
  return details;
}

test("the snapshot leaves out contact details, local fields and education notes", () => {
  const snapshot = buildSnapshot(fullProfile(), 1, new Date("2026-10-18T00:00:00Z"));
  const text = JSON.stringify(snapshot);
  for (const secret of ["ken@example.test", "+63 900", "123 Private St", "1999-01-01", "Filipino", "Jane", "GPA"]) {
    assert.ok(!text.includes(secret), `${secret} must not be published`);
  }
  assert.equal(snapshot.profile.location, "Manila, Philippines");
  assert.equal(snapshot.profile.experience[0].company, "Acme");
});

test("the snapshot matches the contract the portfolio site reads", () => {
  const snapshot = buildSnapshot(fullProfile(), 3, new Date("2026-10-18T00:00:00Z"));
  assert.deepEqual(parsePortfolioSnapshot(JSON.parse(JSON.stringify(snapshot))), snapshot);
  assert.equal(snapshot.publication, 3);
});

test("a blank city or country leaves no stray comma", () => {
  const details = fullProfile();
  details.contact.city = "";
  assert.equal(buildSnapshot(details, 1, new Date()).profile.location, "Philippines");
});
