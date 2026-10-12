import { Practice } from "@/components/engineering/practice";
import { activeRun } from "@/features/engineering-lab/assessment-store";
import { getPractice, practiceCandidates, PRACTICE_MINUTES } from "@/features/engineering-lab/practice-store";
import { requireSession } from "@/lib/session";
import { engineering } from "@/features/engineering-lab/routes";

export const dynamic = "force-dynamic";

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ summary?: string }> }) {
  const { summary } = await searchParams;
  const session = await requireSession(engineering.practice, { summary });
  const [practice, open] = await Promise.all([getPractice(session.userId), activeRun(session.userId)]);
  const candidates = practice ? practice.items.length : (await practiceCandidates(session.userId)).length;
  return (
    <Practice
      email={session.email}
      practice={practice}
      candidates={candidates}
      minutes={PRACTICE_MINUTES}
      summary={summary === "1"}
      closedBook={Boolean(open)}
    />
  );
}
