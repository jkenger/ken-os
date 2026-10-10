import { redirect } from "next/navigation";
import { Rebuilding } from "@/components/engineering/rebuilding";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <Rebuilding email={session.email} title="Practice" tab="practice" />;
}
