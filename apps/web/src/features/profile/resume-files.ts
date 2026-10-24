import { DOCX_MIME, PDF_MIME } from "@ken-os/domain";

// Rules for uploaded resume files: PDF or Word only, told apart by their first bytes rather than what the browser
// claims. Spec: docs/product/profile-resume.md, "Step 5 design".

/** Vercel functions take request bodies up to 4.5 MB, so the cap stays under that with room for the form fields. */
export const RESUME_FILE_MAX_BYTES = 4 * 1024 * 1024;
/** Enough for years of versions; stops a runaway script filling the database. */
export const RESUME_FILE_MAX_COUNT = 50;
const NAME_MAX = 200;

export type ResumeFileType = typeof PDF_MIME | typeof DOCX_MIME;

export class ResumeFileError extends Error {}

/** PDF starts with `%PDF-`. A .docx is a zip, which starts with `PK\x03\x04`, and lists `word/document.xml` by name
 *  (zip entry names are stored as plain text), which a plain zip renamed to .docx doesn't. */
export function detectResumeType(bytes: Uint8Array): ResumeFileType | null {
  const starts = (prefix: number[]) => prefix.every((byte, index) => bytes[index] === byte);
  if (starts([0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF_MIME;
  if (starts([0x50, 0x4b, 0x03, 0x04]) && Buffer.from(bytes).includes("word/document.xml")) return DOCX_MIME;
  return null;
}

/** Keeps the name readable in a download: no folders, no control characters, and the right extension. */
export function cleanResumeName(name: string, type: ResumeFileType): string {
  const extension = type === PDF_MIME ? ".pdf" : ".docx";
  const base = (name.split(/[\\/]/).pop() ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\.(pdf|docx)$/i, "")
    .trim()
    .slice(0, NAME_MAX - extension.length);
  return `${base || "Resume"}${extension}`;
}

/** Checks an upload and returns what to store, or throws with a message for the owner. */
export function checkResumeFile(name: string, bytes: Uint8Array): { fileName: string; contentType: ResumeFileType } {
  if (bytes.byteLength === 0) throw new ResumeFileError("The file is empty");
  if (bytes.byteLength > RESUME_FILE_MAX_BYTES) throw new ResumeFileError("Files can be up to 4 MB");
  const contentType = detectResumeType(bytes);
  const extension = name.toLowerCase().match(/\.(pdf|docx)$/)?.[1];
  const matches =
    (contentType === PDF_MIME && extension === "pdf") || (contentType === DOCX_MIME && extension === "docx");
  if (!contentType || !matches) throw new ResumeFileError("Upload a PDF or Word (.docx) file");
  return { fileName: cleanResumeName(name, contentType), contentType };
}
