import assert from "node:assert/strict";
import { test } from "node:test";
import type { ProfileDetails } from "@ken-os/domain";
import { buildTailoredProfile, tailorResume } from "./tailor";

function profile(overrides: Partial<ProfileDetails> = {}): ProfileDetails {
  return {
    contact: {
      fullName: "Jane Dev",
      headline: "Engineer",
      email: "jane@example.com",
      phone: "",
      city: "",
      country: "",
      links: [],
    },
    summary: "A short summary.",
    experience: [
      {
        company: "Acme",
        title: "Backend Engineer",
        location: "",
        start: "2020-01",
        end: "2022-01",
        bullets: ["Built APIs"],
      },
      { company: "Globex", title: "Frontend Engineer", location: "", start: "2022-02", end: "", bullets: ["Built UI"] },
    ],
    education: [{ school: "State U", degree: "BS", field: "CS", start: "2016", end: "2020", notes: "" }],
    skills: [
      { name: "Backend", items: ["Node", "Postgres"] },
      { name: "Frontend", items: ["React"] },
    ],
    projects: [
      { name: "Project A", link: "", description: "", bullets: ["Did A"] },
      { name: "Project B", link: "", description: "", bullets: ["Did B"] },
    ],
    certifications: [{ name: "AWS SAA", issuer: "AWS", date: "2021" }],
    languages: [{ name: "English", level: "Native" }],
    local: { enabled: false, birthdate: "", civilStatus: "", nationality: "", address: "", references: [] },
    ...overrides,
  };
}

test("buildTailoredProfile reorders/filters only experience, skills and projects", () => {
  const base = profile();
  const result = buildTailoredProfile(base, { experience: [1], skills: [], projects: [0] });
  assert.deepEqual(result.experience, [base.experience[1]]);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.projects, [base.projects[0]]);
  assert.equal(result.contact, base.contact);
  assert.equal(result.summary, base.summary);
  assert.equal(result.education, base.education);
  assert.equal(result.certifications, base.certifications);
  assert.equal(result.languages, base.languages);
  assert.equal(result.local, base.local);
});

test("buildTailoredProfile falls back to the full profile, unfiltered, when every section is empty", () => {
  const base = profile();
  const result = buildTailoredProfile(base, { experience: [], skills: [], projects: [] });
  assert.equal(result, base);
});

test("buildTailoredProfile drops an out-of-bounds index instead of throwing or inventing an entry", () => {
  const base = profile();
  const result = buildTailoredProfile(base, { experience: [0, 5, -1], skills: [], projects: [] });
  assert.deepEqual(result.experience, [base.experience[0]]);
});

test("buildTailoredProfile drops an index exactly at the array's length, one past its last real entry", () => {
  const base = profile();
  const result = buildTailoredProfile(base, { experience: [base.experience.length], skills: [], projects: [] });
  assert.deepEqual(result.experience, []);
});

test("a selection with only one non-empty section still filters -- it is not treated as fully empty", () => {
  const base = profile();
  const onlyProjects = buildTailoredProfile(base, { experience: [], skills: [], projects: [0] });
  assert.deepEqual(onlyProjects.experience, []);
  assert.deepEqual(onlyProjects.skills, []);
  assert.deepEqual(onlyProjects.projects, [base.projects[0]]);

  const onlySkills = buildTailoredProfile(base, { experience: [], skills: [1], projects: [] });
  assert.deepEqual(onlySkills.experience, []);
  assert.deepEqual(onlySkills.skills, [base.skills[1]]);
  assert.deepEqual(onlySkills.projects, []);
});

function noopDeps() {
  return {
    userId: "user-1",
    postingId: "posting-1",
    getProfile: async () => ({
      details: profile(),
      resume: { template: "classic" as const, paper: "letter" as const },
    }),
    getPosting: async () => ({
      title: "Senior Engineer",
      company: "Acme",
      fullDescription: "The full description.",
      summary: "A senior role.",
    }),
    selectEntries: async () => ({
      experience: [] as number[],
      skills: [] as number[],
      projects: [] as number[],
      promptVersion: "jobs-tailor-v1",
      model: "test-model",
    }),
    render: async () => Buffer.from("pdf-bytes"),
    save: async () => {},
  };
}

test("tailorResume renders through the owner's saved template and paper", async () => {
  const renders: unknown[] = [];
  await tailorResume({
    ...noopDeps(),
    render: async (details, template, paper) => {
      renders.push({ template, paper });
      return Buffer.from("pdf-bytes");
    },
  });
  assert.deepEqual(renders, [{ template: "classic", paper: "letter" }]);
});

test("tailorResume saves the bytes, size, selection, prompt version and model", async () => {
  const saved: unknown[] = [];
  await tailorResume({
    ...noopDeps(),
    selectEntries: async () => ({
      experience: [1],
      skills: [0],
      projects: [],
      promptVersion: "jobs-tailor-v1",
      model: "test-model",
    }),
    save: async (postingId, userId, fields) => {
      saved.push({ postingId, userId, fields });
    },
  });
  const [entry] = saved as [{ postingId: string; userId: string; fields: Record<string, unknown> }];
  assert.equal(entry.postingId, "posting-1");
  assert.equal(entry.userId, "user-1");
  assert.equal(entry.fields.size, Buffer.from("pdf-bytes").length);
  assert.deepEqual(entry.fields.selection, { experience: [1], skills: [0], projects: [] });
  assert.equal(entry.fields.promptVersion, "jobs-tailor-v1");
  assert.equal(entry.fields.model, "test-model");
});

test("a thrown error from selectEntries propagates and save is never called", async () => {
  let saveCalled = false;
  await assert.rejects(
    tailorResume({
      ...noopDeps(),
      selectEntries: async () => {
        throw new Error("AI call failed");
      },
      save: async () => {
        saveCalled = true;
      },
    }),
    /AI call failed/,
  );
  assert.equal(saveCalled, false);
});

test("a thrown error from render propagates and save is never called", async () => {
  let saveCalled = false;
  await assert.rejects(
    tailorResume({
      ...noopDeps(),
      render: async () => {
        throw new Error("render failed");
      },
      save: async () => {
        saveCalled = true;
      },
    }),
    /render failed/,
  );
  assert.equal(saveCalled, false);
});

test("selectEntries receives the profile and the posting's title/company, and prefers the full description over the summary when both are present", async () => {
  const calls: unknown[] = [];
  const base = profile();
  await tailorResume({
    ...noopDeps(),
    getProfile: async () => ({ details: base, resume: { template: "classic" as const, paper: "letter" as const } }),
    getPosting: async () => ({
      title: "Senior Engineer",
      company: "Acme",
      fullDescription: "The full description.",
      summary: "A short summary.",
    }),
    selectEntries: async (input) => {
      calls.push(input);
      return { experience: [], skills: [], projects: [], promptVersion: "v", model: "m" };
    },
  });
  const [call] = calls as [{ profile: unknown; title: string; company: string; text: string }];
  assert.equal(call.profile, base);
  assert.equal(call.title, "Senior Engineer");
  assert.equal(call.company, "Acme");
  assert.equal(call.text, "The full description.");
});

test("selectEntries falls back to the summary when there's no full description, and to an empty string when there's neither", async () => {
  const withSummaryOnly: unknown[] = [];
  await tailorResume({
    ...noopDeps(),
    getPosting: async () => ({
      title: "Senior Engineer",
      company: "Acme",
      fullDescription: null,
      summary: "A short summary.",
    }),
    selectEntries: async (input) => {
      withSummaryOnly.push(input);
      return { experience: [], skills: [], projects: [], promptVersion: "v", model: "m" };
    },
  });
  assert.equal((withSummaryOnly[0] as { text: string }).text, "A short summary.");

  const withNeither: unknown[] = [];
  await tailorResume({
    ...noopDeps(),
    getPosting: async () => ({ title: "Senior Engineer", company: "Acme", fullDescription: null, summary: null }),
    selectEntries: async (input) => {
      withNeither.push(input);
      return { experience: [], skills: [], projects: [], promptVersion: "v", model: "m" };
    },
  });
  assert.equal((withNeither[0] as { text: string }).text, "");
});

test("a posting that doesn't exist for this owner throws instead of calling the AI or saving", async () => {
  let selectCalled = false;
  await assert.rejects(
    tailorResume({
      ...noopDeps(),
      getPosting: async () => null,
      selectEntries: async () => {
        selectCalled = true;
        return { experience: [], skills: [], projects: [], promptVersion: "v", model: "m" };
      },
    }),
    /Posting not found/,
  );
  assert.equal(selectCalled, false);
});
