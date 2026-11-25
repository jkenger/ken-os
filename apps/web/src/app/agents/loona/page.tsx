import { LoonaChatPage } from "@/features/loona/loona-chat-page";
import { getLoonaMessages } from "@/features/loona/store";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function Loona() {
  const session = await requireSession("/agents/loona");
  const initialMessages = await getLoonaMessages(session.userId);
  return <LoonaChatPage email={session.email} initialMessages={initialMessages} />;
}
