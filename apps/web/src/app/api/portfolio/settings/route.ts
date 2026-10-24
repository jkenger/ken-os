import { portfolioRoute } from "@/features/portfolio/api";
import { setShowEmail } from "@/features/portfolio/store";

export const runtime = "nodejs";

export async function PUT(request: Request) {
  return portfolioRoute(request, (session, body) => setShowEmail(session.userId, body));
}
