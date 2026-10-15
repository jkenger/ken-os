import { labRoute } from "@/features/engineering-lab/api";
import { searchAllReviews } from "@/features/engineering-lab/review-store";

export const runtime = "nodejs";

/** Finds a term across every review sheet and note: `?q=updater function`. */
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").slice(0, 100);
  return labRoute(request, async (session) => ({ hits: await searchAllReviews(session.userId, query) }), {
    write: false,
  });
}
