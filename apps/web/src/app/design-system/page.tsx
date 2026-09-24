import { redirect } from "next/navigation";
import { DesignSystemWorkspace } from "@/components/design-system-workspace";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DesignSystemPage() {
  const session = await getSession();
  if (!session) redirect("/");
  return <DesignSystemWorkspace email={session.email} />;
}
