import { text, termsRoute } from "@/features/terms/api";
import { saveTerm } from "@/features/terms/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return termsRoute(request, (session, body) => saveTerm(session.userId, {
    term: text(body.term, "term", 200),
    meaning: text(body.meaning, "meaning", 1000),
    sourceTitle: text(body.sourceTitle, "sourceTitle", 300, true) || null,
    sourceUrl: text(body.sourceUrl, "sourceUrl", 1000, true) || null,
    foundIn: text(body.foundIn, "foundIn", 200, true),
    foundAt: text(body.foundAt, "foundAt", 1000, true),
  }), { write: true });
}
