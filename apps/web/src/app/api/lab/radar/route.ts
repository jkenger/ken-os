import { labRoute, readJson } from "@/features/engineering-lab/api";
import { dismissRadarItem, runRadar } from "@/features/engineering-lab/radar-store";
import { LabInputError } from "@/features/engineering-lab/errors";

export const runtime = "nodejs";
export const maxDuration = 180;

/** This week's radar scan for your direction's areas. Once per week. */
export async function POST(request: Request) {
  return labRoute(request, (session) => runRadar(session.userId), { write: true, ai: true });
}

/** Dismisses one radar item. */
export async function DELETE(request: Request) {
  return labRoute(
    request,
    async (session) => {
      const { id } = await readJson(request);
      if (typeof id !== "string" || !id) throw new LabInputError("Radar item not found. Reload the page", 404);
      return dismissRadarItem(session.userId, id);
    },
    { write: true },
  );
}
