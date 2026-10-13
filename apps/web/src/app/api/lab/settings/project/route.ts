import { labRoute, readJson } from "@/features/engineering-lab/api";
import { setProjectUrl } from "@/features/engineering-lab/claude-links";

export const runtime = "nodejs";

/** Saves the Claude Project link from Settings. An empty value clears it. */
export async function POST(request: Request) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return setProjectUrl(session.userId, typeof body.url === "string" ? body.url : "");
    },
    { write: true },
  );
}
