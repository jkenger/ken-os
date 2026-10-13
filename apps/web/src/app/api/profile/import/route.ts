import { profileRoute } from "@/features/profile/api";
import { importFromDrive } from "@/features/profile/store";

export const runtime = "nodejs";
/** Reading a PDF and one model call can take a while. */
export const maxDuration = 60;

export async function POST(request: Request) {
  return profileRoute(request, (session) => importFromDrive(session.userId), { write: true, ai: "Import" });
}
