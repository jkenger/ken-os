import assert from "node:assert/strict";
import { test } from "node:test";
import { GOOGLE_DOC_MIME, PDF_MIME } from "@ken-os/domain";
import { getDriveFile, getResumeBytes } from "@ken-os/drive";

test("the selected Drive ID yields refreshed metadata and latest PDF bytes", async () => {
  const originalFetch = globalThis.fetch;
  const fileId = "resume-selected-123";
  const requests: string[] = [];
  let revision = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push(url);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer test-token");
    if (url.includes("/export?")) {
      return new Response(`revision-${revision}`, { status: 200, headers: { "Content-Type": PDF_MIME } });
    }
    revision++;
    return Response.json({
      id: fileId,
      name: "My Resume",
      mimeType: GOOGLE_DOC_MIME,
      modifiedTime: `2026-09-2${revision}T00:00:00Z`,
      capabilities: { canDownload: true },
      trashed: false,
    });
  };

  try {
    const first = await getDriveFile(fileId, "test-token");
    const firstContent = await getResumeBytes(first, "test-token");
    const updated = await getDriveFile(fileId, "test-token");
    const updatedContent = await getResumeBytes(updated, "test-token");

    assert.equal(first.id, fileId);
    assert.equal(updated.id, fileId);
    assert.notEqual(updated.modifiedTime, first.modifiedTime);
    assert.equal(new TextDecoder().decode(firstContent.bytes), "revision-1");
    assert.equal(new TextDecoder().decode(updatedContent.bytes), "revision-2");
    assert.equal(updatedContent.filename, "My Resume.pdf");
    assert.ok(requests.every((url) => url.includes(`/files/${fileId}`)));
    assert.ok(requests.filter((url) => url.includes("/export?")).every((url) => url.includes("mimeType=application%2Fpdf")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
