import { text, termsRoute } from "@/features/terms/api";
import { listTerms, saveTerm } from "@/features/terms/store";

export const runtime = "nodejs";

/** Saved terms for the page marker: each page underlines them and shows the saved meaning on hover. */
export async function GET(request: Request) {
  return termsRoute(
    request,
    async (session) => ({
      terms: (await listTerms(session.userId)).map(({ id, term, meaning, source }) => ({ id, term, meaning, source })),
    }),
    { write: false },
  );
}

export async function POST(request: Request) {
  return termsRoute(
    request,
    (session, body) =>
      saveTerm(session.userId, {
        term: text(body.term, "term", 200),
        meaning: text(body.meaning, "meaning", 1000),
        sourceTitle: text(body.sourceTitle, "sourceTitle", 300, true) || null,
        sourceUrl: text(body.sourceUrl, "sourceUrl", 1000, true) || null,
        foundIn: text(body.foundIn, "foundIn", 200, true),
        foundAt: text(body.foundAt, "foundAt", 1000, true),
      }),
    { write: true },
  );
}
