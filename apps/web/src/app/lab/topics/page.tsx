import { redirect } from "next/navigation";
import { LabTopics } from "@/components/lab/lab-topics";
import { getAllProgress } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabTopicsPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <LabTopics email={session.email} progress={await getAllProgress(session.userId)} />;
}
