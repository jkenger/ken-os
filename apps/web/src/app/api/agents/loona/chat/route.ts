import { loonaRoute } from "@/features/loona/api";
import { LoonaInputError, sendLoonaMessage } from "@/features/loona/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return loonaRoute(request, async (session, body) => {
    if (typeof body.text !== "string") throw new LoonaInputError("Type a message first");
    const messages = await sendLoonaMessage(session.userId, body.text);
    return { messages };
  });
}
