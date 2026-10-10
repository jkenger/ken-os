import { labRoute } from "@/features/engineering-lab/api";
import { startPractice } from "@/features/engineering-lab/practice-store";

export const runtime = "nodejs";
export const maxDuration = 180;

/** Makes today's practice set. */
export async function POST(request: Request) {
  return labRoute(request, (session) => startPractice(session.userId), { write: true, ai: true });
}
