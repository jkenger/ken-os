// Every Engineering page address in one place, so a link can't drift from the routes that exist.
// Spec: docs/architecture/engineering-rebuild.md, section 3. API routes stay under /api/lab.

/** The three steps of a topic page. */
export type TopicStep = "learn" | "exercise" | "prove";

function withQuery(path: string, query: Record<string, string | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export const engineering = {
  overview: "/engineering",
  profile: "/engineering/profile",
  direction: "/engineering/profile/direction",
  /** Intake when no assessment is open, otherwise the open one. */
  assessment: "/engineering/profile/assessment",
  results: (runId: string) => `/engineering/profile/assessment/${encodeURIComponent(runId)}/results`,
  evidence: (runId: string) => `/engineering/profile/evidence/${encodeURIComponent(runId)}`,
  learn: "/engineering/learn",
  topic: (topicId: string, step?: TopicStep | null) => withQuery(`/engineering/learn/${encodeURIComponent(topicId)}`, { step }),
  practice: "/engineering/practice",
} as const;

/** The four tabs, in order. */
export const engineeringTabs = [
  { id: "overview", label: "Overview", href: engineering.overview },
  { id: "profile", label: "Standing", href: engineering.profile },
  { id: "learn", label: "Learn", href: engineering.learn },
  { id: "practice", label: "Practice", href: engineering.practice },
] as const;

export type EngineeringTab = (typeof engineeringTabs)[number]["id"];

/** Which tab a path belongs to: assessment, direction and evidence live under Profile, topics under Learn. */
export function tabForPath(pathname: string): EngineeringTab {
  if (pathname.startsWith("/engineering/profile")) return "profile";
  if (pathname.startsWith("/engineering/learn")) return "learn";
  if (pathname.startsWith("/engineering/practice")) return "practice";
  return "overview";
}

/**
 * Where an old /lab page now lives, keeping its query string. Null for anything that isn't one of the six legacy
 * pages, such as /api/lab, which keeps its own address.
 */
export function legacyLabPath(pathname: string, search = ""): string | null {
  const query = search && !search.startsWith("?") ? `?${search}` : search;
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/lab") return `${engineering.overview}${query}`;
  if (path === "/lab/profile") return `${engineering.direction}${query}`;
  if (path === "/lab/assessment") return `${engineering.assessment}${query}`;
  if (path === "/lab/practice") return `${engineering.practice}${query}`;
  if (path === "/lab/topics") return `${engineering.learn}${query}`;
  const topic = /^\/lab\/topics\/([^/]+)$/.exec(path);
  if (topic) return `/engineering/learn/${topic[1]}${query}`;
  return null;
}
