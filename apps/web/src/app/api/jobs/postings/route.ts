import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { messages } from "@/lib/messages";
import { listPostingsPage, type PostingSortKey } from "@/features/jobs/store";

export const runtime = "nodejs";

const SORT_KEYS: readonly PostingSortKey[] = ["score", "newest", "pay"];
const PAGE_SIZE = 10;

function isSortKey(value: string | null): value is PostingSortKey {
  return SORT_KEYS.includes(value as PostingSortKey);
}

/** One batch of the New list's infinite scroll. Search and sort run here, in SQL (`listPostingsPage`), not in the
 *  browser -- the client only ever holds the postings it has actually rendered. */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: messages.signedOut }, { status: 401 });

  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort");
  const page = await listPostingsPage(session.userId, {
    state: "new",
    search: url.searchParams.get("search") ?? "",
    sort: isSortKey(sortParam) ? sortParam : "score",
    board: url.searchParams.get("board")?.trim() || undefined,
    cursorValue: url.searchParams.get("cursorValue"),
    cursorId: url.searchParams.get("cursorId"),
    limit: PAGE_SIZE,
  });
  return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
}
