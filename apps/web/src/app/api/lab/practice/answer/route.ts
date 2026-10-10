import { labRoute, readJson } from "@/features/engineering-lab/api";
import { answerPractice } from "@/features/engineering-lab/practice-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Grades one practice answer. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    return answerPractice(session.userId, { questionId: String(body.questionId ?? ""), answer: typeof body.answer === "string" ? body.answer : "", selfRating: Number(body.selfRating) });
  }, { write: true, ai: true });
}
