import { redirect } from "next/navigation";
import { TermsPage } from "@/components/terms/terms-page";
import { listTerms } from "@/features/terms/store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Terms() {
  const session = await getSession();
  if (!session) redirect("/");
  return <TermsPage email={session.email} terms={await listTerms(session.userId)} />;
}
