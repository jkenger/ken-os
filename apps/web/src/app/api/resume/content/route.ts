import { NextResponse } from "next/server";
import { DriveError, getDriveFile, getResumeBytes } from "@ken-os/drive";
import { getGoogleAccessToken } from "@/lib/google";
import { getSelectedResume } from "@/lib/resume";
import { getSession } from "@/lib/session";
import { messages } from "@/lib/messages";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: messages.signedOut }, { status: 401 });
  const selection = await getSelectedResume(session.userId);
  if (!selection)
    return NextResponse.json(
      { error: "Select a resume first." },
      { status: 404 },
    );
  try {
    const accessToken = await getGoogleAccessToken(session.userId);
    const file = await getDriveFile(selection.fileId, accessToken);
    if (file.trashed)
      return NextResponse.json(
        { error: "The selected file is in the trash." },
        { status: 404 },
      );
    const content = await getResumeBytes(file, accessToken);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const filename = content.filename.replace(/[\r\n"\\]/g, "_");
    return new NextResponse(content.bytes, {
      headers: {
        "Content-Type": content.mimeType,
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const status = error instanceof DriveError ? error.status : 502;
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not load resume content.",
      },
      { status },
    );
  }
}
