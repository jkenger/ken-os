import { MemoryWorkspace } from "@/components/memory-workspace";
import { getMemoryOverview } from "@/features/project-memory/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const session = await requireSession("/memory");
  const overview = await getMemoryOverview(session.userId);
  return <MemoryWorkspace email={session.email} overview={overview} />;
}
