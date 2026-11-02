import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import { getPortfolio } from "@/features/portfolio/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Portfolio() {
  const session = await requireSession("/portfolio");
  return <PortfolioWorkspace email={session.email} portfolio={await getPortfolio(session.userId)} />;
}
