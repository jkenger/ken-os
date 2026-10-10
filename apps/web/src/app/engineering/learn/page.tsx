import { redirect } from "next/navigation";
import { Learn } from "@/components/engineering/learn";
import { activeRun } from "@/features/engineering-lab/assessment-store";
import { topicMap } from "@/features/engineering-lab/curriculum";
import { getPathView } from "@/features/engineering-lab/path-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/");
  const { area } = await searchParams;
  const [view, open] = await Promise.all([getPathView(session.userId), activeRun(session.userId)]);
  return <Learn email={session.email} map={topicMap} view={view} area={topicMap.areas.some((item) => item.id === area) ? area! : null} closedBook={Boolean(open)} />;
}
