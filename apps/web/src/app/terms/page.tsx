import { TermsPage } from "@/components/terms/terms-page";
import { listTerms } from "@/features/terms/store";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Terms() {
  const session = await requireSession("/terms");
  return <TermsPage email={session.email} terms={await listTerms(session.userId)} />;
}
