import { activeRun } from "@/features/engineering-lab/assessment-store";
import { text, termsRoute } from "@/features/terms/api";
import { lookupTerm, TermInputError } from "@/features/terms/store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  return termsRoute(request, async (session, body) => {
    // The assessment is closed-book everywhere in Ken OS, not only on its own page.
    if (await activeRun(session.userId)) throw new TermInputError("Lookups pause during an assessment. Finish it first", 409);
    return lookupTerm(session.userId, {
      selection: text(body.selection, "selection", 200),
      context: text(body.context, "context", 2000, true),
      place: text(body.place, "place", 200, true),
    });
  }, { write: true });
}
