import { text, termsRoute } from "@/features/terms/api";
import { lookupTerm } from "@/features/terms/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return termsRoute(request, (session, body) => lookupTerm(session.userId, {
    selection: text(body.selection, "selection", 200),
    context: text(body.context, "context", 2000, true),
    place: text(body.place, "place", 200, true),
  }), { write: true });
}
