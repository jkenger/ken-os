// Engineering Lab source rules. The module spec lives in docs/product/ai-engineering-learning-handoff.md.

/** How fast a topic's facts go stale, which decides when its sources must be checked again. */
export type FreshnessClass = "core_concept" | "web_platform" | "framework" | "ai_ecosystem";

export const REFRESH_AFTER_DAYS: Record<FreshnessClass, number> = {
  core_concept: 365,
  web_platform: 180,
  framework: 60,
  ai_ecosystem: 14,
};

/** Source priority from the spec, highest first. */
export const SOURCE_TIERS = ["specification", "official_docs", "provider_docs", "technical_reference", "community"] as const;
export type SourceTier = (typeof SOURCE_TIERS)[number];

/** Domains the Researcher may cite, grouped so a skill can pick only the ones that fit it. */
export const SOURCE_DOMAINS = {
  javascript: ["developer.mozilla.org", "tc39.es", "html.spec.whatwg.org", "nodejs.org", "v8.dev"],
  web: ["developer.mozilla.org", "fetch.spec.whatwg.org", "html.spec.whatwg.org", "httpwg.org", "rfc-editor.org", "datatracker.ietf.org", "web.dev"],
  react: ["react.dev", "nextjs.org"],
  database: ["postgresql.org", "www.postgresql.org"],
  ai: ["platform.openai.com", "developers.openai.com", "docs.anthropic.com", "docs.claude.com", "modelcontextprotocol.io", "ai-sdk.dev"],
} as const satisfies Record<string, readonly string[]>;

export interface ResearchTarget {
  skillId: string;
  title: string;
  /** The exact gap to repair, taken from the baseline assessment. */
  gap: string;
  freshness: FreshnessClass;
  allowedDomains: readonly string[];
}

export interface SourceClaim {
  statement: string;
  sourceUrl: string;
}

export interface PacketSource {
  title: string;
  url: string;
  tier: SourceTier;
  retrievedAt: string;
  whyItMatters: string;
}

export interface SourcePacket {
  schemaVersion: 1;
  skillId: string;
  title: string;
  gap: string;
  generatedAt: string;
  sourceCheckedAt: string;
  refreshAfter: string;
  sources: PacketSource[];
  claims: SourceClaim[];
  misconceptionsToAddress: string[];
  openQuestions: string[];
  /** Anything the Researcher returned that broke the source rules, kept visible instead of silently dropped. */
  rejected: string[];
}

/** What the model is allowed to decide. Dates, allowlist checks, and refresh timing are set in code. */
export interface ResearchDraft {
  sources: { title: string; url: string; tier: SourceTier; whyItMatters: string }[];
  claims: SourceClaim[];
  misconceptionsToAddress: string[];
  openQuestions: string[];
}

const MAX_SOURCES = 5;

function hostAllowed(url: string, allowedDomains: readonly string[]) {
  let host: string;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    host = parsed.hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function normalizeUrl(url: string) {
  const parsed = new URL(url);
  parsed.hash = "";
  for (const key of [...parsed.searchParams.keys()]) if (key.startsWith("utm_")) parsed.searchParams.delete(key);
  return parsed.toString();
}

/** Turns an untrusted model draft into a packet that keeps only allowlisted sources and claims backed by them. */
export function finalizeSourcePacket(target: ResearchTarget, draft: ResearchDraft, now = new Date()): SourcePacket {
  const checkedAt = now.toISOString().slice(0, 10);
  const rejected: string[] = [];
  const sources: PacketSource[] = [];
  const seen = new Set<string>();

  for (const source of draft.sources) {
    if (!hostAllowed(source.url, target.allowedDomains)) {
      rejected.push(`Source outside allowlist: ${source.url}`);
      continue;
    }
    const url = normalizeUrl(source.url);
    if (seen.has(url)) continue;
    if (sources.length >= MAX_SOURCES) {
      rejected.push(`Source over the limit of ${MAX_SOURCES}: ${url}`);
      continue;
    }
    seen.add(url);
    sources.push({ title: source.title.trim(), url, tier: source.tier, retrievedAt: checkedAt, whyItMatters: source.whyItMatters.trim() });
  }

  const claims: SourceClaim[] = [];
  for (const claim of draft.claims) {
    const url = hostAllowed(claim.sourceUrl, target.allowedDomains) ? normalizeUrl(claim.sourceUrl) : null;
    if (!url || !seen.has(url)) {
      rejected.push(`Claim without a kept source: ${claim.statement}`);
      continue;
    }
    claims.push({ statement: claim.statement.trim(), sourceUrl: url });
  }

  const refresh = new Date(now);
  refresh.setUTCDate(refresh.getUTCDate() + REFRESH_AFTER_DAYS[target.freshness]);

  return {
    schemaVersion: 1,
    skillId: target.skillId,
    title: target.title,
    gap: target.gap,
    generatedAt: now.toISOString(),
    sourceCheckedAt: checkedAt,
    refreshAfter: refresh.toISOString().slice(0, 10),
    sources,
    claims,
    misconceptionsToAddress: draft.misconceptionsToAddress.map((item) => item.trim()).filter(Boolean),
    openQuestions: draft.openQuestions.map((item) => item.trim()).filter(Boolean),
    rejected,
  };
}

export function isPacketUsable(packet: SourcePacket) {
  return packet.sources.length > 0 && packet.claims.length > 0;
}
