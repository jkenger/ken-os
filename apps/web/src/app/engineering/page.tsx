import { RoadmapPage } from "@/components/engineering/roadmap/roadmap-page";
import { listConnections } from "@/features/connector/oauth-store";
import { claudeProjectUrl } from "@/features/engineering-lab/ask-claude";
import { getRoadmap } from "@/features/engineering-lab/roadmap-store";
import { engineering } from "@/features/engineering-lab/routes";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The Claude-first roadmap (docs/architecture/engineering-claude-first.md). `?topic=` opens that topic's panel. */
export default async function RoadmapRoute({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const session = await requireSession(engineering.roadmap(topic));
  const [view, connections] = await Promise.all([getRoadmap(session.userId), listConnections(session.userId)]);
  // A link may name any topic on the roadmap, including ones Claude added.
  const onRoadmap = view.chapters.some((chapter) => chapter.topics.some((item) => item.id === topic));
  return (
    <RoadmapPage
      email={session.email}
      view={view}
      connections={connections}
      projectUrl={claudeProjectUrl()}
      initialTopic={topic && onRoadmap ? topic : null}
    />
  );
}
