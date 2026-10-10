import { labRoute, readJson } from "@/features/engineering-lab/api";
import { submitAnswer } from "@/features/engineering-lab/assessment-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Locks one answer and grades it. No AI check up front: the answer saves even when grading fails. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    return submitAnswer(session.userId, (await params).id, {
      index: Number(body.index),
      answer: typeof body.answer === "string" ? body.answer : "",
      output: typeof body.output === "string" ? body.output : undefined,
      selfRating: Number(body.selfRating),
    });
  }, { write: true });
}
