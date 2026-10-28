import { profileRoute } from "@/features/profile/api";
import { analyzeFromForm } from "@/features/profile/store";

export const runtime = "nodejs";
/** One model call over the whole Profile can take a while. */
export const maxDuration = 60;

export async function POST(request: Request) {
  return profileRoute(request, (session, body) => analyzeFromForm(session.userId, body), {
    write: true,
    ai: "Analyze",
  });
}
