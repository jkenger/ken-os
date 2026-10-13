import { labRoute } from "@/features/engineering-lab/api";
import { getExercisePanel } from "@/features/engineering-lab/exercise-store";
import { getProgress, requireTopic } from "@/features/engineering-lab/store";

export const runtime = "nodejs";

/** Try it in code: the topic's current exercise version, the owner's draft, and whether it stands passed. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const topic = requireTopic((await params).id);
      const [exercise, progress] = await Promise.all([
        getExercisePanel(session.userId, topic),
        getProgress(session.userId, topic.id),
      ]);
      return {
        exercise,
        progress: { exercisePassed: progress.exercisePassed, solutionOpened: progress.solutionOpened },
      };
    },
    { write: false },
  );
}
