import { labRoute } from "@/features/engineering-lab/api";
import { LabInputError } from "@/features/engineering-lab/errors";
import { getReview } from "@/features/engineering-lab/review-store";

export const runtime = "nodejs";

/** The topic's Review tab: the latest review sheet, or `?version=` for an older one. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const asked = new URL(request.url).searchParams.get("version");
  return labRoute(
    request,
    async (session) => {
      const version = asked === null ? undefined : Number(asked);
      if (version !== undefined && (!Number.isInteger(version) || version < 1))
        throw new LabInputError("Version must be a whole number");
      return getReview(session.userId, (await params).id, version);
    },
    { write: false },
  );
}
