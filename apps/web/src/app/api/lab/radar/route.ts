import { labRoute } from "@/features/engineering-lab/api";
import { runRadar } from "@/features/engineering-lab/radar-store";

export const runtime = "nodejs";
export const maxDuration = 180;

/** This week's radar scan for your direction's areas. Once per week. */
export async function POST(request: Request) {
  return labRoute(request, (session) => runRadar(session.userId), { write: true, ai: true });
}
