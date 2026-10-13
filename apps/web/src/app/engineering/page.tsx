import { RoadmapPage } from "@/components/engineering/roadmap/roadmap-page";
import { listConnections } from "@/features/connector/oauth-store";
import { mcpUrl } from "@/features/connector/rules";
import { getInstructionsSeen, getProjectUrl } from "@/features/engineering-lab/claude-links";
import { instructionsState } from "@/features/engineering-lab/claude-setup";
import { getRoadmap } from "@/features/engineering-lab/roadmap-store";
import { engineering } from "@/features/engineering-lab/routes";
import { appUrl } from "@/lib/config";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The Claude-first roadmap (docs/architecture/engineering-claude-first.md). `?topic=` opens that topic's panel. */
export default async function RoadmapRoute({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  const session = await requireSession(engineering.roadmap(topic));
  const [view, connections, projectUrl, seen] = await Promise.all([
    getRoadmap(session.userId),
    listConnections(session.userId),
    getProjectUrl(session.userId),
    getInstructionsSeen(session.userId),
  ]);
  // A link may name any topic on the roadmap, including ones Claude added.
  const onRoadmap = view.chapters.some((chapter) => chapter.topics.some((item) => item.id === topic));
  return (
    <RoadmapPage
      email={session.email}
      view={view}
      connections={connections}
      projectUrl={projectUrl}
      mcpUrl={mcpUrl(appUrl())}
      instructions={instructionsState(seen.version)}
      initialTopic={topic && onRoadmap ? topic : null}
    />
  );
}
