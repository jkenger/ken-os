import { labRoute, readJson } from "@/features/engineering-lab/api";
import { LabInputError } from "@/features/engineering-lab/errors";
import { addChapter, chooseDirection, dismissRadarItem, saveIntake, validIntake } from "@/features/engineering-lab/profile-store";

export const runtime = "nodejs";

/** Changes the owner confirms on the profile: intake, direction, an added chapter, a dismissed radar item. */
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    if (body.action === "intake") return saveIntake(session.userId, validIntake(body.intake));
    if (body.action === "direction") {
      if (body.roleId !== null && typeof body.roleId !== "string") throw new LabInputError("roleId must be a role id or null.");
      return chooseDirection(session.userId, body.roleId as string | null);
    }
    if (body.action === "addChapter") {
      const chapter = (body.chapter ?? {}) as Record<string, unknown>;
      if (typeof chapter.title !== "string" || typeof chapter.area !== "string" || typeof chapter.reason !== "string") throw new LabInputError("A chapter needs a title, an area and a reason.");
      return addChapter(session.userId, { title: chapter.title, area: chapter.area, reason: chapter.reason });
    }
    if (body.action === "dismissRadar") {
      if (typeof body.id !== "string") throw new LabInputError("id is required.");
      return dismissRadarItem(session.userId, body.id);
    }
    throw new LabInputError("action must be intake, direction, addChapter or dismissRadar.");
  }, { write: true });
}
