// Every Engineering page address in one place, so a link can't drift from the routes that exist.
// Spec: docs/architecture/engineering-claude-first.md, sections 1 and 8. Engineering is one page; API routes stay under
// /api/lab. Old Engineering and /lab addresses redirect here, from next.config.ts.

function withQuery(path: string, query: Record<string, string | undefined | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value);
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export const engineering = {
  /**
   * A roadmap: the one named, else the one opened last (docs/architecture/engineering-roadmaps.md, section 1). `topic`
   * opens that topic's panel.
   */
  roadmap: (topicId?: string | null, roadmapId?: string | null) =>
    withQuery("/engineering", { roadmap: roadmapId, topic: topicId }),
} as const;

/** Engineering's one section. */
export const engineeringTabs = [{ id: "roadmap", label: "Roadmap", href: "/engineering" }] as const;

export type EngineeringTab = (typeof engineeringTabs)[number]["id"];

export function tabForPath(_pathname: string): EngineeringTab {
  return "roadmap";
}

/**
 * Where old Engineering and /lab addresses go: a topic's page opens that topic on the roadmap, everything else opens
 * the roadmap. Permanent (308) since 13 Oct 2026, at the owner's call. Used by next.config.ts.
 */
export const engineeringRedirects = [
  { source: "/engineering/roadmap", destination: "/engineering", permanent: true },
  { source: "/engineering/learn/:topicId", destination: "/engineering?topic=:topicId", permanent: true },
  { source: "/engineering/:path+", destination: "/engineering", permanent: true },
  { source: "/lab/topics/:topicId", destination: "/engineering?topic=:topicId", permanent: true },
  { source: "/lab", destination: "/engineering", permanent: true },
  { source: "/lab/:path+", destination: "/engineering", permanent: true },
];
