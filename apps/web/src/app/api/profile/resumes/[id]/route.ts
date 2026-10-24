import { NextResponse } from "next/server";
import { PDF_MIME } from "@ken-os/domain";
import { deleteResumeFile, getResumeFile } from "@/features/profile/resume-files-store";
import { messages } from "@/lib/messages";
import { hasValidOrigin } from "@/lib/origin";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

/** The file as uploaded. A PDF opens in the browser unless `download=1`; a Word file always downloads. */
export async function GET(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const file = await getResumeFile(session.userId, (await params).id);
  if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });
  const download = file.contentType !== PDF_MIME || new URL(request.url).searchParams.get("download") === "1";
  const name = file.fileName;
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${name.replace(/[^\x20-\x7e]|"/g, "")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request: Request, { params }: Params) {
  if (!hasValidOrigin(request)) return NextResponse.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  if (!(await deleteResumeFile(session.userId, (await params).id)))
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
}
