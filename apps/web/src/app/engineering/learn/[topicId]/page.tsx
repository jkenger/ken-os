import { redirect } from "next/navigation";
import { Rebuilding } from "@/components/engineering/rebuilding";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function TopicPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <Rebuilding email={session.email} title="Topic" tab="learn" />;
}
