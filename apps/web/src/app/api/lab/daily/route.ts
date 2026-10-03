import { labRoute } from "@/features/engineering-lab/api";
import { generateDailySet } from "@/features/engineering-lab/daily";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Writes today's practice set, or returns it if it already exists. */
export async function POST(request: Request) {
  return labRoute(request, (session) => generateDailySet(session.userId), { write: true, ai: true });
}
