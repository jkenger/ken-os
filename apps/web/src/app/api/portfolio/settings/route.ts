import { portfolioRoute } from "@/features/portfolio/api";
import { updateSettings } from "@/features/portfolio/store";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  return portfolioRoute(request, (session, body) => updateSettings(session.userId, body));
}
