import assert from "node:assert/strict";
import { test } from "node:test";
import { DOCX_MIME, PDF_MIME } from "@ken-os/domain";
import {
  checkResumeFile,
  cleanResumeName,
  detectResumeType,
  RESUME_FILE_MAX_BYTES,
  ResumeFileError,
} from "./resume-files";

const pdf = new TextEncoder().encode("%PDF-1.7\n...");
/** The start of a zip entry for `word/document.xml`, as every .docx has. */
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]), Buffer.from("word/document.xml")]);
const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]), Buffer.from("photos/cat.jpg")]);

test("the file type comes from the first bytes", () => {
  assert.equal(detectResumeType(pdf), PDF_MIME);
  assert.equal(detectResumeType(docx), DOCX_MIME);
  assert.equal(detectResumeType(new TextEncoder().encode("<html>")), null);
  assert.equal(detectResumeType(zip), null, "a plain zip isn't a Word file");
});

test("PDF and Word files with a matching name are accepted", () => {
  assert.deepEqual(checkResumeFile("Ken Resume.PDF", pdf), { fileName: "Ken Resume.pdf", contentType: PDF_MIME });
  assert.deepEqual(checkResumeFile("cv.docx", docx), { fileName: "cv.docx", contentType: DOCX_MIME });
});

test("other files, renamed files, empty and oversized files are refused", () => {
  const refused = (name: string, bytes: Uint8Array) =>
    assert.throws(() => checkResumeFile(name, bytes), ResumeFileError);
  refused("resume.pdf", new TextEncoder().encode("<html>"));
  refused("resume.docx", pdf);
  refused("resume.zip", docx);
  refused("resume.docx", zip);
  refused("resume.pdf", new Uint8Array());
  const big = new Uint8Array(RESUME_FILE_MAX_BYTES + 1);
  big.set(pdf);
  refused("resume.pdf", big);
});

test("names lose folders and control characters, and keep the real extension", () => {
  assert.equal(cleanResumeName("C:\\Users\\ken\\My CV.pdf", PDF_MIME), "My CV.pdf");
  assert.equal(cleanResumeName("../../evil\u0000.pdf", PDF_MIME), "evil.pdf");
  assert.equal(cleanResumeName(".pdf", PDF_MIME), "Resume.pdf");
  assert.equal(cleanResumeName(`${"a".repeat(300)}.docx`, DOCX_MIME).length, 200);
});
