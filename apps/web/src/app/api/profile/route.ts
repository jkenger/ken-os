import { profileRoute } from "@/features/profile/api";
import { getProfile, saveProfile } from "@/features/profile/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return profileRoute(request, (session) => getProfile(session.userId), { write: false });
}

export async function PUT(request: Request) {
  return profileRoute(
    request,
    (session, body) => {
      const importId = typeof body.importId === "string" ? body.importId : null;
      return saveProfile(session.userId, body.details, importId);
    },
    { write: true },
  );
}
