import { z } from "zod";
import type { TopicStatus } from "@ken-os/domain";

// Claude's material for a topic (docs/architecture/roadmap-ui.md, "Topic panel: what comes next"). Claude is the only
// writer. Two kinds, written at different times:
// - A topic's plan on one roadmap: prerequisites, related topics, an estimate and a difficulty. Written when a roadmap
//   is planned, and corrected later one topic at a time.
// - A topic's material: a one-line description, the wording of its three tasks, learning resources and mastery
//   criteria. Written when the topic starts, and replaced whole to correct it.
// Pure, so the store, the connector tools and the tests share the rules.

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const difficultyWords: Record<Difficulty, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export const RESOURCE_KINDS = ["docs", "video", "repo", "article"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

const topicId = z.string().min(1).max(100);
const line = (max: number) => z.string().trim().min(1).max(max);

/** One topic's plan in a save; fields left out keep their saved value. */
export const topicPlanInput = z
  .object({
    topicId: topicId.describe("A topic id on this roadmap"),
    prerequisites: z
      .array(topicId)
      .max(5)
      .optional()
      .describe("Topics on this roadmap to learn first. Only real dependencies; no loops"),
    related: z
      .array(topicId)
      .max(3)
      .optional()
      .describe("Up to 3 topics on this roadmap that connect to this one, but aren't needed first"),
    minutes: z.number().int().min(5).max(600).optional().describe("Your estimate for this owner, in minutes"),
    difficulty: z.enum(DIFFICULTIES).optional().describe("For this owner, given their background"),
  })
  .strict();
export type TopicPlanInput = z.infer<typeof topicPlanInput>;

export interface TopicPlan {
  prerequisites: string[];
  related: string[];
  minutes: number | null;
  difficulty: Difficulty | null;
}

const emptyPlan: TopicPlan = { prerequisites: [], related: [], minutes: null, difficulty: null };

/** The first prerequisite loop in the plans, searched from `first` before the rest, as ids back to the start, or null. */
function findLoop(plans: Record<string, TopicPlan>, first: readonly string[]): string[] | null {
  const done = new Set<string>();
  const visit = (id: string, path: string[]): string[] | null => {
    const at = path.indexOf(id);
    if (at >= 0) return [...path.slice(at), id];
    if (done.has(id)) return null;
    for (const next of plans[id]?.prerequisites ?? []) {
      const loop = visit(next, [...path, id]);
      if (loop) return loop;
    }
    done.add(id);
    return null;
  };
  for (const id of new Set([...first, ...Object.keys(plans)])) {
    const loop = visit(id, []);
    if (loop) return loop;
  }
  return null;
}

/**
 * The roadmap's plans after a save: each topic sent gets the fields it sent, the rest keep theirs. Throws with a line
 * Claude can act on when a topic isn't on the roadmap, points at itself, or the prerequisites loop.
 */
export function mergePlans(
  roadmapTopicIds: readonly string[],
  existing: Readonly<Record<string, TopicPlan>>,
  incoming: readonly TopicPlanInput[],
): Record<string, TopicPlan> {
  const known = new Set(roadmapTopicIds);
  const onRoadmap = (id: string) => {
    if (!known.has(id)) throw new Error(`${id} isn't on this roadmap`);
  };
  const merged = { ...existing };
  for (const { topicId: id, ...fields } of incoming) {
    onRoadmap(id);
    for (const other of fields.prerequisites ?? []) {
      onRoadmap(other);
      if (other === id) throw new Error(`${id} can't depend on itself`);
    }
    for (const other of fields.related ?? []) {
      onRoadmap(other);
      if (other === id) throw new Error(`${id} can't be related to itself`);
    }
    const saved = merged[id] ?? emptyPlan;
    merged[id] = {
      prerequisites: fields.prerequisites ? [...new Set(fields.prerequisites)] : saved.prerequisites,
      related: fields.related ? [...new Set(fields.related)] : saved.related,
      minutes: fields.minutes ?? saved.minutes,
      difficulty: fields.difficulty ?? saved.difficulty,
    };
  }
  const loop = findLoop(
    merged,
    incoming.map((plan) => plan.topicId),
  );
  if (loop) throw new Error(`Loop: ${loop.join(" → ")}. Remove one of these prerequisites`);
  return merged;
}

/** The prerequisites not yet Learned or Skipped. Advice for the owner, never a lock. */
export function waitingOn(plan: TopicPlan | undefined, statusOf: (topicId: string) => TopicStatus | undefined) {
  return (plan?.prerequisites ?? []).filter((id) => {
    const status = statusOf(id);
    return status !== "learned" && status !== "skipped";
  });
}

/** An estimate as the panel shows it: "~25 min", "~1 h", "~1 h 30 min". */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `~${hours} h ${rest} min` : `~${hours} h`;
}

export const topicMaterialInput = z
  .object({
    topicId: topicId.describe("A Ken OS topic id"),
    description: line(200).describe("One line on what the topic is about, in plain language"),
    tasks: z
      .object({
        read: line(160).describe("What to read with Claude, such as 'Read React's Render and Commit page'"),
        build: line(160).describe("A small thing to build, such as 'Build a list that breaks with index keys'"),
        explain: line(160).describe("What to explain in their own words to prove it"),
      })
      .strict(),
    resources: z
      .array(
        z
          .object({
            title: line(120),
            url: z
              .string()
              .url()
              .max(500)
              .refine((url) => url.startsWith("https://"), "Links must start with https://"),
            kind: z.enum(RESOURCE_KINDS),
          })
          .strict(),
      )
      .max(6)
      .describe("Real pages you have checked: official docs first. Ken OS refuses links that don't load"),
    criteria: z
      .array(line(200))
      .min(3)
      .max(6)
      .describe("3 to 6 things the owner should be able to explain to show they have it"),
  })
  .strict();
export type TopicMaterialInput = z.infer<typeof topicMaterialInput>;
export type TopicMaterial = Omit<TopicMaterialInput, "topicId">;

type Fetcher = (
  url: string,
  init?: { method?: string; redirect?: "follow"; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
}>;

/** A domain that doesn't exist: the network error a made-up site gives. */
function noSuchSite(error: unknown) {
  const code = (error as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "ENOTFOUND" || code === "EAI_NONAME";
}

/**
 * The links that look made up: the site answers with an error status (404 and the like), or the domain doesn't exist.
 * Tries HEAD, then GET for sites that refuse HEAD. A slow or briefly unreachable site passes: a timeout says nothing
 * about whether the page is real. A model can make up a plausible link; this is the one check before it shows.
 */
export async function brokenLinks(urls: readonly string[], fetcher: Fetcher = fetch) {
  type Outcome = "ok" | "broken" | "unknown";
  const attempt = async (url: string, method: string): Promise<Outcome> => {
    try {
      const response = await fetcher(url, { method, redirect: "follow", signal: AbortSignal.timeout(15_000) });
      return response.ok || (response.status >= 300 && response.status < 400) ? "ok" : "broken";
    } catch (error) {
      return noSuchSite(error) ? "broken" : "unknown";
    }
  };
  const check = async (url: string): Promise<Outcome> => {
    const head = await attempt(url, "HEAD");
    return head === "ok" ? "ok" : (await attempt(url, "GET")) === "broken" ? "broken" : "ok";
  };
  const results = await Promise.all(urls.map(async (url) => ({ url, outcome: await check(url) })));
  return results.filter((result) => result.outcome === "broken").map((result) => result.url);
}

/**
 * Retire as replaced (docs/architecture/roadmap-ui.md): once Claude writes a topic's material, its mastery criteria
 * become the topic's points and its description the topic's line, everywhere they're read: the panel, get_topic's
 * p1, p2…, review sheets and the own-words check. Until then the old material stays as the fallback.
 */
export function withMaterial<T extends { gap: string | null; points: string[] }>(
  topic: T,
  material: Pick<TopicMaterial, "description" | "criteria"> | null,
): T {
  return material ? { ...topic, gap: material.description, points: material.criteria } : topic;
}
