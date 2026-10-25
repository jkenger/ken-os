import { profileRoute } from "@/features/profile/api";
import { autofillFromResume } from "@/features/profile/store";

export const runtime = "nodejs";
/** Claude reading a whole resume can take a while. */
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  return profileRoute(request, (session) => autofillFromResume(session.userId, id), { write: true, ai: "Autofill" });
}
