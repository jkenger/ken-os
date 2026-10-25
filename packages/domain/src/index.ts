export const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";
export const PDF_MIME = "application/pdf";
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const RESUME_MIME_TYPES = [GOOGLE_DOC_MIME, PDF_MIME, DOCX_MIME] as const;

export type ResumeMimeType = (typeof RESUME_MIME_TYPES)[number];

export function isResumeMimeType(value: string): value is ResumeMimeType {
  return RESUME_MIME_TYPES.some((type) => type === value);
}

export interface Artifact {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  canDownload?: boolean;
  trashed?: boolean;
}
export * from "./engineering-lab";
export * from "./terms";
export * from "./profile";
export * from "./resume";
export * from "./rewrite";
export * from "./autofill";
