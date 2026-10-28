import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ANALYSIS_STANDARD,
  analysisTargets,
  applyAnalysis,
  checkAnalysis,
  emptyProfile,
  isAnalysisStale,
  type AnalysisOutput,
  type ProfileDetails,
} from "@ken-os/domain";

function profile(): ProfileDetails {
  const details = emptyProfile();
  details.summary = "I build web apps with React and Laravel for clinics.";
  details.experience = [
    {
      company: "Elite Medical Care",
      title: "Full Stack Engineer",
      location: "",
      start: "2024-04",
      end: "",
      bullets: ["Built a CRM serving 2,900 patients", "Responsible for code reviews"],
    },
    { company: "Xircus", title: "Web Developer", location: "", start: "2022", end: "2023", bullets: [] },
  ];
  details.projects = [{ name: "Loots", link: "", description: "", bullets: ["Shipped a learning roadmap"] }];
  return details;
}

/** A model answer that passes every criterion it judges, for the targets given. */
function allPass(details: ProfileDetails): AnalysisOutput {
  return {
    sections: analysisTargets(details).map((target) => ({
      id: target.id,
      checks: ANALYSIS_STANDARD[target.kind].map((criterion) => ({ id: criterion.id, pass: true, note: "" })),
      recommendation: [],
      tip: "",
    })),
  };
}

const sectionOf = (sections: ReturnType<typeof checkAnalysis>, id: string) => {
  const found = sections.find((section) => section.id === id);
  assert.ok(found, `no section ${id}`);
  return found;
};
const verdict = (sections: ReturnType<typeof checkAnalysis>, id: string, criterion: string) =>
  sectionOf(sections, id).checks.find((check) => check.id === criterion)?.pass;

test("the standard names five checks for a summary and five for bullets, each with a label", () => {
  assert.deepEqual(
    ANALYSIS_STANDARD.summary.map((criterion) => criterion.id),
    ["role", "results", "specifics", "pronouns", "length"],
  );
  assert.deepEqual(
    ANALYSIS_STANDARD.bullets.map((criterion) => criterion.id),
    ["verb", "results", "numbers", "pronouns", "length"],
  );
  for (const criterion of [...ANALYSIS_STANDARD.summary, ...ANALYSIS_STANDARD.bullets]) assert.ok(criterion.label);
});

test("targets are the summary, then each role and project that has bullets, with where they sit", () => {
  assert.deepEqual(
    analysisTargets(profile()).map(({ id, section, kind, place }) => ({ id, section, kind, place })),
    [
      { id: "summary", section: "summary", kind: "summary", place: "Summary" },
      { id: "experience.0", section: "experience", kind: "bullets", place: "Full Stack Engineer, Elite Medical Care" },
      { id: "projects.0", section: "projects", kind: "bullets", place: "Loots" },
    ],
  );
});

test("an empty summary is still a target, so the analyzer can write one", () => {
  const details = profile();
  details.summary = "";
  assert.equal(analysisTargets(details)[0].id, "summary");
  assert.deepEqual(analysisTargets(details)[0].lines, []);
});

test("rule checks are computed from the text and override the model", () => {
  const details = profile();
  const sections = checkAnalysis(details, allPass(details));
  // "I build..." uses a pronoun and is one sentence, whatever the model said.
  assert.equal(verdict(sections, "summary", "pronouns"), false);
  assert.equal(verdict(sections, "summary", "length"), false);
  // The role has a number in a bullet; the project has none.
  assert.equal(verdict(sections, "experience.0", "numbers"), true);
  assert.equal(verdict(sections, "projects.0", "numbers"), false);
  // Model-judged checks keep the model's verdict.
  assert.equal(verdict(sections, "experience.0", "verb"), true);
});

test("a model verdict the standard doesn't list is ignored, and one it leaves out counts as a pass", () => {
  const details = profile();
  const output = allPass(details);
  output.sections[1].checks = [{ id: "made-up", pass: false, note: "x" }];
  const role = sectionOf(checkAnalysis(details, output), "experience.0");
  assert.deepEqual(
    role.checks.map((check) => check.id),
    ["verb", "results", "numbers", "pronouns", "length"],
  );
  assert.equal(role.checks.find((check) => check.id === "verb")?.pass, true);
});

test("checks carry the standard's label and the model's note, trimmed", () => {
  const details = profile();
  const output = allPass(details);
  output.sections[1].checks[0] = { id: "verb", pass: false, note: "  Second bullet starts with Responsible for  " };
  const check = sectionOf(checkAnalysis(details, output), "experience.0").checks[0];
  assert.deepEqual(check, {
    id: "verb",
    label: "Starts with an action verb",
    pass: false,
    note: "Second bullet starts with Responsible for",
  });
});

test("a recommendation with a number the profile doesn't have is dropped, but the checks stay", () => {
  const details = profile();
  const output = allPass(details);
  output.sections[1].recommendation = ["Built a CRM serving 2,900 patients", "Cut review time by 40%"];
  const role = sectionOf(checkAnalysis(details, output), "experience.0");
  assert.equal(role.recommendation, null);
  assert.equal(role.checks.length, 5);
});

test("a recommendation that only uses known numbers is kept, cleaned of blank lines and extra spaces", () => {
  const details = profile();
  const output = allPass(details);
  output.sections[1].recommendation = [
    "  Built a CRM that serves  2,900 patients ",
    "",
    "Review teammates' code daily",
  ];
  assert.deepEqual(sectionOf(checkAnalysis(details, output), "experience.0").recommendation, [
    "Built a CRM that serves 2,900 patients",
    "Review teammates' code daily",
  ]);
});

test("a summary recommendation is one paragraph; a recommendation equal to what's there is no recommendation", () => {
  const details = profile();
  const output = allPass(details);
  output.sections[0].recommendation = ["Full-stack engineer building React and Laravel apps for clinics.", "Extra"];
  output.sections[2].recommendation = ["Shipped a learning roadmap"];
  const sections = checkAnalysis(details, output);
  assert.deepEqual(sectionOf(sections, "summary").recommendation, [
    "Full-stack engineer building React and Laravel apps for clinics.",
  ]);
  assert.equal(sectionOf(sections, "projects.0").recommendation, null);
});

test("unknown and repeated section ids from the model are dropped; every target still gets a section", () => {
  const details = profile();
  const output = allPass(details);
  output.sections.push({ ...output.sections[0], recommendation: ["Second answer for the summary"] });
  output.sections.push({ id: "experience.9", checks: [], recommendation: [], tip: "" });
  const sections = checkAnalysis(details, output);
  assert.deepEqual(
    sections.map((section) => section.id),
    ["summary", "experience.0", "projects.0"],
  );
  assert.equal(sectionOf(sections, "summary").recommendation, null);
});

test("each section keeps the lines it judged, so a later edit marks it stale", () => {
  const details = profile();
  const role = sectionOf(checkAnalysis(details, allPass(details)), "experience.0");
  assert.deepEqual(role.before, details.experience[0].bullets);
  assert.equal(isAnalysisStale(role, details), false);
  details.experience[0].bullets[1] = "Reviewed code";
  assert.equal(isAnalysisStale(role, details), true);
  details.experience = [];
  assert.equal(isAnalysisStale(role, details), true);
});

test("using a recommendation replaces the summary or the whole bullet list, and nothing else", () => {
  const details = profile();
  const summary = applyAnalysis(details, "summary", ["Full-stack engineer for clinics."]);
  assert.equal(summary.summary, "Full-stack engineer for clinics.");
  assert.deepEqual(summary.experience, details.experience);

  const role = applyAnalysis(details, "experience.0", ["Built a CRM serving 2,900 patients", "Review code daily"]);
  assert.deepEqual(role.experience[0].bullets, ["Built a CRM serving 2,900 patients", "Review code daily"]);
  assert.equal(role.experience[0].company, "Elite Medical Care");
  assert.equal(details.experience[0].bullets[1], "Responsible for code reviews", "the original is not changed");

  const project = applyAnalysis(details, "projects.0", ["Shipped a learning roadmap in Next.js"]);
  assert.deepEqual(project.projects[0].bullets, ["Shipped a learning roadmap in Next.js"]);
});
