import { labRoute, readJson } from "@/features/engineering-lab/api";
import { setTopicChat } from "@/features/engineering-lab/claude-links";

export const runtime = "nodejs";

/** Links a topic to the Claude chat it was learned in. An empty value unlinks it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return setTopicChat(session.userId, (await params).id, typeof body.url === "string" ? body.url : "");
    },
    { write: true },
  );
}
