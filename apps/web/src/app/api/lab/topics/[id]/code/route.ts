import { requireAnyTopic } from "@/features/engineering-lab/any-topic";
import { labRoute } from "@/features/engineering-lab/api";
import { getCodePanel } from "@/features/engineering-lab/exercise-store";
import { getProgress } from "@/features/engineering-lab/store";

export const runtime = "nodejs";

/**
 * Try it in code: the topic's current exercise version, the owner's draft, and whether it stands passed. A topic Claude
 * added may have no exercise yet, or only one still waiting for its browser check.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const topic = await requireAnyTopic(session.userId, (await params).id);
      const [code, progress] = await Promise.all([
        getCodePanel(session.userId, topic),
        getProgress(session.userId, topic.id),
      ]);
      return {
        ...code,
        progress: { exercisePassed: progress.exercisePassed, solutionOpened: progress.solutionOpened },
      };
    },
    { write: false },
  );
}
