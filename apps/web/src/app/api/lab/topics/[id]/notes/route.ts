import { labRoute, readJson } from "@/features/engineering-lab/api";
import { addNote } from "@/features/engineering-lab/status-store";

export const runtime = "nodejs";

/** The owner adds a note to a topic. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return addNote(session.userId, (await params).id, "owner", typeof body.body === "string" ? body.body : "");
    },
    { write: true },
  );
}
