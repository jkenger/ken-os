import { redirect } from "next/navigation";
import { RoadmapPage } from "@/components/engineering/roadmap/roadmap-page";
import { listConnections } from "@/features/connector/oauth-store";
import { mcpUrl } from "@/features/connector/rules";
import { getInstructionsSeen, getProjectUrl } from "@/features/engineering-lab/claude-links";
import { instructionsState } from "@/features/engineering-lab/claude-setup";
import { LabInputError } from "@/features/engineering-lab/errors";
import { archivedRoadmaps, getRoadmap, getRoadmaps, getRoadmapSummary } from "@/features/engineering-lab/roadmap-store";
import { engineering } from "@/features/engineering-lab/routes";
import { appUrl } from "@/lib/config";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * The Claude-first roadmap (docs/architecture/engineering-claude-first.md). `?roadmap=` names one of the owner's
 * roadmaps, else the one opened last shows (engineering-roadmaps.md, section 1); `?topic=` opens that topic's panel.
 */
export default async function RoadmapRoute({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; roadmap?: string }>;
}) {
  const { topic, roadmap } = await searchParams;
  const session = await requireSession(engineering.roadmap(topic, roadmap));
  const [view, roadmaps, archived, connections, projectUrl, seen] = await Promise.all([
    // A roadmap that isn't the owner's, or no longer exists, falls back to the one opened last.
    getRoadmap(session.userId, roadmap).catch((error: unknown) => {
      if (error instanceof LabInputError) return null;
      throw error;
    }),
    getRoadmaps(session.userId),
    archivedRoadmaps(session.userId),
    listConnections(session.userId),
    getProjectUrl(session.userId),
    getInstructionsSeen(session.userId),
  ]);
  if (!view) redirect(engineering.roadmap(topic));
  const summary = await getRoadmapSummary(session.userId, view);
  // A link may name any topic on the roadmap, including ones Claude added.
  const onRoadmap = view.chapters.some((chapter) => chapter.topics.some((item) => item.id === topic));
  return (
    <RoadmapPage
      email={session.email}
      view={view}
      roadmaps={roadmaps
        .filter((item) => item.planned && item.id)
        .map((item) => ({
          id: item.id!,
          goal: item.goal?.title ?? "Roadmap",
          learned: item.counts.learned,
          total: item.counts.total,
        }))}
      archived={archived}
      summary={summary}
      connections={connections}
      projectUrl={projectUrl}
      mcpUrl={mcpUrl(appUrl())}
      instructions={instructionsState(seen.version)}
      initialTopic={topic && onRoadmap ? topic : null}
    />
  );
}
