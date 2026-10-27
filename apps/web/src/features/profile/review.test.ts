import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyProfile, type ProfileDetails } from "@ken-os/domain";
import { reviewProfile } from "./review";

function complete(): ProfileDetails {
  const details = emptyProfile();
  details.contact = {
    fullName: "Ken",
    headline: "Full-stack engineer",
    email: "ken@example.test",
    phone: "",
    city: "Pasay",
    country: "Philippines",
    links: [{ label: "GitHub", url: "https://github.com/ken" }],
  };
  details.summary =
    "Full-stack engineer with two years of production work in React, Next.js and Laravel, shipping internal tools and client systems end to end, from intake to deployment.";
  details.experience = [
    {
      company: "Elite Medical Care",
      title: "Full Stack Engineer",
      location: "",
      start: "2024-04",
      end: "",
      bullets: ["Built a CRM that now serves 2,900 patients"],
    },
  ];
  details.education = [
    { school: "STI College", degree: "BS", field: "Computer Science", start: "", end: "", notes: "" },
  ];
  details.skills = [{ name: "Frontend", items: ["React"] }];
  return details;
}

const texts = (details: ProfileDetails) => reviewProfile(details).map((issue) => issue.text);
const sections = (details: ProfileDetails) => reviewProfile(details).map((issue) => issue.section);

test("a complete profile has no issues", () => {
  assert.deepEqual(reviewProfile(complete()), []);
});

test("optional sections left empty are never issues", () => {
  const details = complete();
  assert.equal(details.projects.length + details.certifications.length + details.languages.length, 0);
  assert.equal(details.local.enabled, false);
  assert.deepEqual(reviewProfile(details), []);
});

test("an empty profile names one issue per missing core part, in section order", () => {
  const issues = reviewProfile(emptyProfile());
  assert.deepEqual(
    issues.map((issue) => issue.text),
    [
      "Add your name",
      "Add a headline",
      "Add an email",
      "Add a location",
      "Add a link, such as GitHub or LinkedIn",
      "Write a summary",
      "Add a role",
      "Add a school",
      "Add skills",
    ],
  );
  assert.deepEqual(
    [...new Set(issues.map((issue) => issue.section))],
    ["contact", "summary", "experience", "education", "skills"],
  );
});

test("a city or a country alone counts as a location", () => {
  const details = complete();
  details.contact.city = "";
  assert.deepEqual(texts(details), []);
});

test("a summary outside 150 to 600 characters is flagged, with which way to fix it", () => {
  const short = complete();
  short.summary = "Builds things.";
  assert.deepEqual(texts(short), ["Lengthen the summary to 2 to 4 sentences"]);

  const long = complete();
  long.summary = "x".repeat(601);
  assert.deepEqual(texts(long), ["Shorten the summary to under 600 characters"]);
});

test("each role is checked for a start date, bullets, and a number in a bullet", () => {
  const details = complete();
  details.experience.push(
    { company: "Xircus", title: "Web Developer", location: "", start: "", end: "", bullets: [] },
    { company: "Dashcore", title: "Designer", location: "", start: "2022", end: "2023", bullets: ["Led the redesign"] },
  );
  assert.deepEqual(texts(details), [
    "Add a start date to Web Developer, Xircus",
    "Add bullets to Web Developer, Xircus",
    "Add a number to a bullet in Designer, Dashcore",
  ]);
  assert.deepEqual(sections(details), ["experience", "experience", "experience"]);
});

test("blank bullets don't count as bullets", () => {
  const details = complete();
  details.experience[0].bullets = ["  "];
  assert.deepEqual(texts(details), ["Add bullets to Full Stack Engineer, Elite Medical Care"]);
});

test("every issue has its own id, so a list can key on it", () => {
  const ids = reviewProfile(emptyProfile()).map((issue) => issue.id);
  assert.equal(new Set(ids).size, ids.length);
});
