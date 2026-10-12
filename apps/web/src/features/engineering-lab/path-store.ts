import { evidenceLevel, pathChapters, type Area, type Level, type TopicState } from "@ken-os/domain";
import { latestAreaScores } from "./assessment-store";
import { careers, placeOf, topicMap } from "./curriculum";
import { getProfileRow } from "./profile-store";
import { getAllProgress } from "./store";

// My path and the next topic, shared by Overview and Learn. Spec: docs/architecture/engineering-rebuild.md, section 3.
// My path keeps only the chapters the target role needs, weakest area first (from the latest assessment), then course order.

export interface NextTopic {
  id: string;
  title: string;
  area: string;
  chapter: string;
  state: TopicState;
}

export interface PathView {
  /** Chapter ids in My path order, or null without a target role. */
  path: string[] | null;
  states: Record<string, TopicState>;
  next: NextTopic | null;
  areaLevels: Record<Area, Level | null>;
}

export async function getPathView(userId: string): Promise<PathView> {
  const [profile, progress, scores] = await Promise.all([
    getProfileRow(userId),
    getAllProgress(userId),
    latestAreaScores(userId),
  ]);
  const role = careers.roles.find((item) => item.id === profile?.direction) ?? null;
  const path = role ? pathChapters(topicMap, careers, role, scores) : null;
  const states = Object.fromEntries(progress.map((item) => [item.topicId, item.state])) as Record<string, TopicState>;
  const proven = new Set(progress.filter((item) => item.state === "PROVEN").map((item) => item.topicId));

  // Continue what's in progress first, most recent first; otherwise the first unproven topic on the path.
  const active = progress
    .filter((item) => item.state === "LEARNING" || item.state === "PRACTICING")
    .sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""))[0];
  const order = path ?? topicMap.chapters.map((chapter) => chapter.id);
  const ordered = order.flatMap((chapter) => topicMap.topics.filter((topic) => topic.chapter === chapter));
  const pick = active
    ? topicMap.topics.find((topic) => topic.id === active.topicId)
    : ordered.find((topic) => !proven.has(topic.id));
  const next = pick ? { id: pick.id, title: pick.title, ...placeOf(pick), state: states[pick.id] } : null;

  const areaLevels = Object.fromEntries(
    careers.areas.map((ladder) => [ladder.id, evidenceLevel(topicMap, ladder, proven)]),
  ) as Record<Area, Level | null>;
  return { path, states, next, areaLevels };
}
