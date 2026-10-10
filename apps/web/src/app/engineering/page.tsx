import { redirect } from "next/navigation";
import { Overview, PracticeCard } from "@/components/engineering/overview";
import { activeRun, getRunView, listRuns } from "@/features/engineering-lab/assessment-store";
import { careers, topicMap } from "@/features/engineering-lab/curriculum";
import { getPathView } from "@/features/engineering-lab/path-store";
import { getPractice, practiceCandidates, PRACTICE_MINUTES } from "@/features/engineering-lab/practice-store";
import { getRadarView } from "@/features/engineering-lab/radar-store";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function EngineeringPage() {
  const session = await getSession();
  if (!session) redirect("/");
  const [runs, open, path, radar] = await Promise.all([listRuns(session.userId), activeRun(session.userId), getPathView(session.userId), getRadarView(session.userId)]);
  const openView = open ? await getRunView(session.userId, open.id) : null;
  const finished = runs.some((run) => run.completedAt);
  const practice = finished ? await getPractice(session.userId) : null;
  const ready = practice ? practice.items.filter((item) => !item.answered).length : finished ? (await practiceCandidates(session.userId)).length : 0;
  const areas = topicMap.areas.map((area) => ({ id: area.id, title: area.title, summary: careers.areas.find((ladder) => ladder.id === area.id)?.summary ?? "" }));
  return (
    <Overview
      email={session.email}
      assessment={{
        finished,
        open: openView ? { answered: openView.answers.filter((answer) => answer.label).length, total: openView.questions.length } : null,
      }}
      path={path}
      areas={areas}
      radar={radar}
      practice={finished ? <PracticeCard ready={ready} done={Boolean(practice?.done)} minutes={PRACTICE_MINUTES} /> : undefined}
    />
  );
}
