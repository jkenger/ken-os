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
