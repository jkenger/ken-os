import { Learn } from "@/components/engineering/learn";
import { activeRun } from "@/features/engineering-lab/assessment-store";
import { topicMap } from "@/features/engineering-lab/curriculum";
import { getPathView } from "@/features/engineering-lab/path-store";
import { requireSession } from "@/lib/session";
import { engineering } from "@/features/engineering-lab/routes";

export const dynamic = "force-dynamic";

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ area?: string }> }) {
  const { area } = await searchParams;
  const session = await requireSession(engineering.learn, { area });
  const [view, open] = await Promise.all([getPathView(session.userId), activeRun(session.userId)]);
  return (
    <Learn
      email={session.email}
      map={topicMap}
      view={view}
      area={topicMap.areas.some((item) => item.id === area) ? area! : null}
      closedBook={Boolean(open)}
    />
  );
}
