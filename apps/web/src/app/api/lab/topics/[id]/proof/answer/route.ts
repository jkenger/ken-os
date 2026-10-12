import { labRoute, readJson } from "@/features/engineering-lab/api";
import { submitProof } from "@/features/engineering-lab/topic-store";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Grades a proof answer. Every rubric line met proves the topic. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return submitProof(session.userId, (await params).id, {
        questionId: String(body.questionId ?? ""),
        answer: typeof body.answer === "string" ? body.answer : "",
        selfRating: Number(body.selfRating),
      });
    },
    { write: true, ai: true },
  );
}
