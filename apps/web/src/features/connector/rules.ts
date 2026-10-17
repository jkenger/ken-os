import { createHash, randomBytes } from "node:crypto";

// The connector's OAuth rules, with no database. Spec: docs/architecture/engineering-claude-connector.md, section 3.
// Loots is its own authorization server for one owner, following the MCP authorization spec and what claude.ai needs:
// https://claude.com/docs/connectors/building/authentication

/** The one scope: read Engineering progress and code, save lessons, exercises and proof questions. */
export const SCOPE = "engineering";

export const ACCESS_TOKEN_SECONDS = 60 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
export const CODE_SECONDS = 10 * 60;

/** Hosts a redirect URI or a client metadata URL may use. claude.ai's callback is https://claude.ai/api/mcp/auth_callback. */
export function allowedHosts(value = process.env.MCP_ALLOWED_REDIRECT_HOSTS): string[] {
  const hosts = (value ?? "claude.ai,claude.com")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return hosts.length ? hosts : ["claude.ai", "claude.com"];
}

function httpsUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hash || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

/** An https redirect URI on an allowed host, exactly. No fragments, credentials or ports. */
export function isAllowedRedirect(value: unknown, hosts = allowedHosts()): value is string {
  const url = httpsUrl(value);
  return Boolean(url && hosts.includes(url.hostname.toLowerCase()));
}

/** A client metadata document URL Loots may fetch: https, on an allowed host, with a path. Anything else is never fetched. */
export function isMetadataClientId(value: unknown, hosts = allowedHosts()): value is string {
  const url = httpsUrl(value);
  return Boolean(url && url.pathname !== "/" && hosts.includes(url.hostname.toLowerCase()));
}

/** The host to name on the consent page: the client metadata URL's or the redirect URI's, never a self-asserted name. */
export function hostOf(value: string) {
  return new URL(value).hostname;
}

/** A random token with a readable prefix. Only its hash is stored. */
export function newToken(prefix: "kos_code" | "kos_at" | "kos_rt") {
  return `${prefix}_${randomBytes(32).toString("base64url")}`;
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** PKCE with S256 only (RFC 7636): the verifier is 43 to 128 unreserved characters and hashes to the challenge. */
export function pkceMatches(verifier: unknown, challenge: string) {
  if (typeof verifier !== "string" || !/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

export const isPkceChallenge = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);

export const mcpUrl = (appUrl: string) => `${appUrl}/api/mcp`;
export const resourceMetadataUrl = (appUrl: string) => `${appUrl}/.well-known/oauth-protected-resource/api/mcp`;

/** RFC 9728: what /api/mcp is and who issues its tokens. `resource` must equal the URL added in Claude. */
export function protectedResourceMetadata(appUrl: string) {
  return {
    resource: mcpUrl(appUrl),
    authorization_servers: [appUrl],
    scopes_supported: [SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "Loots Engineering",
  };
}

/**
 * RFC 8414. claude.ai uses a client metadata URL only when both `client_id_metadata_document_supported` and the
 * public-client method `none` are listed, and otherwise registers itself at `registration_endpoint`.
 */
export function authorizationServerMetadata(appUrl: string) {
  return {
    issuer: appUrl,
    authorization_endpoint: `${appUrl}/oauth/authorize`,
    token_endpoint: `${appUrl}/api/oauth/token`,
    registration_endpoint: `${appUrl}/api/oauth/register`,
    scopes_supported: [SCOPE],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    token_endpoint_auth_methods_supported: ["none"],
    code_challenge_methods_supported: ["S256"],
    client_id_metadata_document_supported: true,
  };
}

/** The 401 that starts sign-in in Claude. It must be a 401: Claude ignores the header on any other status. */
export function unauthorized(appUrl: string, description = "Sign in to Loots") {
  const header = `Bearer error="invalid_token", error_description="${description}", resource_metadata="${resourceMetadataUrl(appUrl)}", scope="${SCOPE}"`;
  return new Response(JSON.stringify({ error: "invalid_token", error_description: description }), {
    status: 401,
    headers: { "Content-Type": "application/json", "WWW-Authenticate": header, "Cache-Control": "no-store" },
  });
}

/** An OAuth error from the token or registration endpoint (RFC 6749 section 5.2). */
export function oauthError(error: string, description: string, status = 400) {
  return Response.json({ error, error_description: description }, { status, headers: { "Cache-Control": "no-store" } });
}

/** The authorize request as it arrives, before anything about it is trusted. */
export interface AuthorizeQuery {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  state?: string;
  scope?: string;
  resource?: string;
}

/** Where to send an error once the redirect URI is known to be the client's own (RFC 6749 section 4.1.2.1). */
export function redirectWith(redirectUri: string, params: Record<string, string | undefined>) {
  const url = new URL(redirectUri);
  for (const [key, value] of Object.entries(params)) if (value !== undefined) url.searchParams.set(key, value);
  return url.toString();
}

/**
 * Checks the parts of an authorize request that don't need the client: response type, PKCE, scope and resource.
 * Returns the OAuth error to send back, or null.
 */
export function checkAuthorizeParams(
  query: AuthorizeQuery,
  appUrl: string,
): { error: string; description: string } | null {
  if (query.response_type !== "code")
    return { error: "unsupported_response_type", description: "Only the code flow is supported" };
  if (query.code_challenge_method !== "S256" || !isPkceChallenge(query.code_challenge)) {
    return { error: "invalid_request", description: "PKCE with S256 is required" };
  }
  const scopes = (query.scope ?? SCOPE).split(" ").filter(Boolean);
  // offline_access is how some clients ask for a refresh token; one is always issued.
  if (!scopes.every((scope) => scope === SCOPE || scope === "offline_access"))
    return { error: "invalid_scope", description: `The only scope is ${SCOPE}` };
  if (query.resource !== undefined && query.resource.replace(/\/$/, "") !== mcpUrl(appUrl)) {
    return { error: "invalid_target", description: "Unknown resource" };
  }
  if (query.state !== undefined && query.state.length > 1_000)
    return { error: "invalid_request", description: "state is too long" };
  return null;
}
