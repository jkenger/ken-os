import { redirect } from "next/navigation";
import { MemoryWorkspace } from "@/components/memory-workspace";
import { getMemoryOverview } from "@/features/project-memory/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const overview = await getMemoryOverview(session.userId);
  return <MemoryWorkspace email={session.email} overview={overview} />;
}
