import { DOCX_MIME, GOOGLE_DOC_MIME, PDF_MIME, type Artifact } from "@ken-os/domain";

const BASE = "https://www.googleapis.com/drive/v3/files";

export class DriveError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function driveFetch(url: string, accessToken: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new DriveError(response.status, `Google Drive request failed (${response.status}).`);
  }
  return response;
}

export async function getDriveFile(fileId: string, accessToken: string): Promise<Artifact> {
  const params = new URLSearchParams({
    fields: "id,name,mimeType,modifiedTime,webViewLink,capabilities(canDownload),trashed",
  });
  const response = await driveFetch(`${BASE}/${encodeURIComponent(fileId)}?${params}`, accessToken);
  const file = await response.json() as Artifact & { capabilities?: { canDownload?: boolean } };
  return { ...file, canDownload: file.capabilities?.canDownload };
}

export async function getResumeBytes(file: Artifact, accessToken: string): Promise<{ bytes: ArrayBuffer; mimeType: string; filename: string }> {
  if (file.canDownload === false) throw new DriveError(403, "This file cannot be downloaded.");
  let url: string;
  let mimeType: string;
  let filename: string;
  if (file.mimeType === GOOGLE_DOC_MIME) {
    url = `${BASE}/${encodeURIComponent(file.id)}/export?${new URLSearchParams({ mimeType: PDF_MIME })}`;
    mimeType = PDF_MIME;
    filename = `${file.name}.pdf`;
  } else if (file.mimeType === PDF_MIME || file.mimeType === DOCX_MIME) {
    url = `${BASE}/${encodeURIComponent(file.id)}?alt=media`;
    mimeType = file.mimeType;
    filename = file.name;
  } else {
    throw new DriveError(415, "Unsupported resume type.");
  }
  const response = await driveFetch(url, accessToken);
  return { bytes: await response.arrayBuffer(), mimeType, filename };
}

export async function getGoogleDocText(fileId: string, accessToken: string): Promise<string> {
  const url = `${BASE}/${encodeURIComponent(fileId)}/export?${new URLSearchParams({ mimeType: "text/plain" })}`;
  return (await driveFetch(url, accessToken)).text();
}
