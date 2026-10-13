import { labRoute, readJson } from "@/features/engineering-lab/api";
import { deleteNote, editNote } from "@/features/engineering-lab/status-store";

export const runtime = "nodejs";

/** The owner edits any note, theirs or Claude's. */
export async function PUT(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return editNote(session.userId, (await params).noteId, typeof body.body === "string" ? body.body : "");
    },
    { write: true },
  );
}

/** The owner deletes any note. */
export async function DELETE(request: Request, { params }: { params: Promise<{ noteId: string }> }) {
  return labRoute(request, async (session) => deleteNote(session.userId, (await params).noteId), { write: true });
}
