import { AgentsListPage } from "@/features/agents/agents-list-page";
import { requireSession } from "@/lib/auth/session";

export default async function Agents() {
  const session = await requireSession("/agents");
  return <AgentsListPage email={session.email} />;
}
