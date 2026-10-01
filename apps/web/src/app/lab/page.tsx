import { redirect } from "next/navigation";
import { LabToday } from "@/components/lab/lab-today";
import { getToday } from "@/features/engineering-lab/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LabPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <LabToday email={session.email} today={await getToday(session.userId)} />;
}
