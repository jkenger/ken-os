import { TOPIC_STATUSES, type TopicStatus } from "@ken-os/domain";
import { labRoute, readJson } from "@/features/engineering-lab/api";
import { LabInputError } from "@/features/engineering-lab/errors";
import { setStatus } from "@/features/engineering-lab/status-store";

export const runtime = "nodejs";

/** The owner sets a topic's status from the topic panel. Learned needs one line on why. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      if (!TOPIC_STATUSES.includes(body.status as TopicStatus)) throw new LabInputError("Choose a status");
      return setStatus(
        session.userId,
        (await params).id,
        body.status as TopicStatus,
        typeof body.reason === "string" ? body.reason : undefined,
      );
    },
    { write: true },
  );
}
