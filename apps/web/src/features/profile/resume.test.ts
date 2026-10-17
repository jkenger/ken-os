import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { extractText, getDocumentProxy } from "unpdf";
import {
  contactLine,
  normalizeProfile,
  printDateRange,
  RESUME_TEMPLATES,
  resumeFileName,
  sectionsToPrint,
} from "@ken-os/domain";
import type * as ResumePdf from "./resume-pdf";

/**
 * Loads the real resume-pdf.tsx as an ES module. @react-pdf publishes some files for `import` only, which the Next
 * server uses but this test runner (CommonJS) can't load, so esbuild bundles our code to ESM and leaves @react-pdf and
 * React to Node's own import.
 */
async function loadResumePdf(): Promise<typeof ResumePdf> {
  const dir = join(process.cwd(), "node_modules", ".cache");
  mkdirSync(dir, { recursive: true });
  const outfile = join(dir, `resume-pdf-test-${process.pid}.mjs`);
  await build({
    entryPoints: [join(process.cwd(), "src/features/profile/resume-pdf.tsx")],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    external: ["@react-pdf/*", "react", "react/*"],
    logLevel: "error",
  });
  try {
    return await import(pathToFileURL(outfile).href);
  } finally {
    rmSync(outfile, { force: true });
  }
}

const details = normalizeProfile(
  {
    contact: {
      fullName: "Ken Gervacio",
      headline: "Full-stack engineer",
      email: "ken@example.com",
      phone: "+63 900 000 0000",
      city: "Manila",
      country: "Philippines",
      links: [{ label: "GitHub", url: "https://github.com/ken" }],
    },
    summary: "Builds web apps end to end.",
    experience: [
      { company: "Acme", title: "Engineer", start: "2023-04", end: "", bullets: ["Shipped the billing page"] },
    ],
    education: [{ school: "UP Diliman", degree: "BS", field: "Computer Science", start: "2015", end: "2019" }],
    skills: [{ name: "Languages", items: ["TypeScript", "Go"] }],
    projects: [{ name: "Loots", description: "A private workspace" }],
    local: { enabled: true, birthdate: "1995-06-30", civilStatus: "Single", address: "12 Secret St" },
  },
  "save",
);

test("dates print one way everywhere", () => {
  assert.equal(printDateRange("2023-04", ""), "Apr 2023 – Present");
  assert.equal(printDateRange("2015", "2019"), "2015 – 2019");
  assert.equal(printDateRange("", "2019-12"), "Dec 2019");
  assert.equal(printDateRange("", ""), "");
});

test("contact line, section order and file name", () => {
  assert.deepEqual(contactLine(details), [
    "ken@example.com",
    "+63 900 000 0000",
    "Manila, Philippines",
    "github.com/ken",
  ]);
  assert.deepEqual(sectionsToPrint(details, "classic"), ["summary", "experience", "education", "skills", "projects"]);
  assert.deepEqual(sectionsToPrint(details, "technical").slice(0, 3), ["summary", "skills", "projects"]);
  assert.equal(resumeFileName(details), "Ken Gervacio Resume.pdf");
  assert.equal(resumeFileName(normalizeProfile({ contact: { fullName: 'a/b:"c"' } }, "save")), "abc Resume.pdf");
});

test("every template makes a PDF an ATS can read, in order, without local fields", async () => {
  const { renderResumePdf } = await loadResumePdf();
  for (const { id } of RESUME_TEMPLATES) {
    for (const paper of ["letter", "a4"] as const) {
      const pdf = await renderResumePdf(details, id, paper);
      const { text } = await extractText(await getDocumentProxy(new Uint8Array(pdf)), { mergePages: true });
      for (const expected of [
        "Ken Gervacio",
        "ken@example.com",
        "EXPERIENCE",
        "Engineer, Acme",
        "Apr 2023 – Present",
        "Shipped the billing page",
        "TypeScript, Go",
      ]) {
        assert.ok(text.includes(expected), `${id}/${paper} has "${expected}"`);
      }
      assert.ok(text.indexOf("Ken Gervacio") < text.indexOf("EXPERIENCE"), `${id}: the name comes first`);
      for (const hidden of ["1995-06-30", "Single", "12 Secret St"])
        assert.ok(!text.includes(hidden), `${id} leaves out "${hidden}"`);
    }
  }
});
