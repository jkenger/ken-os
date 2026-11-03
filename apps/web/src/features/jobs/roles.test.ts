import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProfile } from "@ken-os/domain";
import { deriveRoles } from "./roles";

function withExperience(titles: string[]) {
  const details = emptyProfile();
  details.contact.headline = "Senior Frontend Engineer";
  details.experience = titles.map((title) => ({
    company: "Co",
    title,
    location: "",
    start: "2024-01",
    end: "",
    bullets: [],
  }));
  return details;
}

test("the headline plus the last two job titles, in order", () => {
  assert.deepEqual(deriveRoles(withExperience(["Frontend Engineer", "React Developer", "Junior Developer"])), [
    "Senior Frontend Engineer",
    "Frontend Engineer",
    "React Developer",
  ]);
});

test("a duplicate between the headline and a job title appears once", () => {
  assert.deepEqual(deriveRoles(withExperience(["Senior Frontend Engineer", "React Developer"])), [
    "Senior Frontend Engineer",
    "React Developer",
  ]);
});

test("an empty headline is dropped, not kept as a blank role", () => {
  const details = withExperience(["Frontend Engineer"]);
  details.contact.headline = "";
  assert.deepEqual(deriveRoles(details), ["Frontend Engineer"]);
});

test("no experience yet leaves just the headline", () => {
  assert.deepEqual(deriveRoles(withExperience([])), ["Senior Frontend Engineer"]);
});

test("a headline joined with middle dots splits into its separate phrases", () => {
  const details = withExperience([]);
  details.contact.headline = "Full-stack Engineer · React / Next.js / TypeScript · Production Web Applications";
  assert.deepEqual(deriveRoles(details), [
    "Full-stack Engineer",
    "React / Next.js / TypeScript",
    "Production Web Applications",
  ]);
});

test("a job title joined with middle dots also splits", () => {
  const details = withExperience(["Senior Engineer · Platform Team"]);
  assert.deepEqual(deriveRoles(details), ["Senior Frontend Engineer", "Senior Engineer", "Platform Team"]);
});

test("a plain title with no middle dot is unaffected", () => {
  assert.deepEqual(deriveRoles(withExperience(["Frontend Engineer"])), [
    "Senior Frontend Engineer",
    "Frontend Engineer",
  ]);
});

test("a blank segment between two dots is dropped, not kept as an empty role", () => {
  const details = withExperience([]);
  details.contact.headline = "Engineer ·  · Remote";
  assert.deepEqual(deriveRoles(details), ["Engineer", "Remote"]);
});
