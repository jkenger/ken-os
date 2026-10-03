import { termsRoute } from "@/features/terms/api";
import { deleteTerm } from "@/features/terms/store";

export const runtime = "nodejs";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return termsRoute(request, async (session) => { await deleteTerm(session.userId, id); return { deleted: true }; }, { write: true });
}
