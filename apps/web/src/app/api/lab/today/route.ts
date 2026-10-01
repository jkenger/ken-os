import { labRoute } from "@/features/engineering-lab/api";
import { getToday } from "@/features/engineering-lab/store";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return labRoute(request, (session) => getToday(session.userId), { write: false });
}
