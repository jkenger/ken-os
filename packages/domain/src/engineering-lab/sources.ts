// Topic freshness and the domains a topic's sources come from. Terms reuses the domains for its lookups.

/** How fast a topic's facts go stale, which decides when its sources must be checked again. */
export type FreshnessClass = "core_concept" | "web_platform" | "framework" | "ai_ecosystem";

/** Trusted domains, grouped so a topic can pick only the ones that fit it. */
export const SOURCE_DOMAINS = {
  javascript: ["developer.mozilla.org", "tc39.es", "html.spec.whatwg.org", "nodejs.org", "v8.dev"],
  web: [
    "developer.mozilla.org",
    "fetch.spec.whatwg.org",
    "html.spec.whatwg.org",
    "httpwg.org",
    "rfc-editor.org",
    "datatracker.ietf.org",
    "web.dev",
  ],
  react: ["react.dev", "nextjs.org"],
  database: ["postgresql.org", "www.postgresql.org"],
  ai: [
    "platform.openai.com",
    "developers.openai.com",
    "docs.anthropic.com",
    "docs.claude.com",
    "modelcontextprotocol.io",
    "ai-sdk.dev",
  ],
  operations: ["opentelemetry.io", "owasp.org", "sre.google"],
  typescript: ["www.typescriptlang.org", "zod.dev"],
  testing: ["vitest.dev", "playwright.dev", "testing-library.com", "nodejs.org"],
} as const satisfies Record<string, readonly string[]>;
export type SourceGroup = keyof typeof SOURCE_DOMAINS;
