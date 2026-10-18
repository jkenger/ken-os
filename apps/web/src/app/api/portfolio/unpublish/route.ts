import { portfolioRoute } from "@/features/portfolio/api";
import { unpublishPortfolio } from "@/features/portfolio/store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return portfolioRoute(request, (session) => unpublishPortfolio(session.userId));
}
