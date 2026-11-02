import { randomUUID } from "node:crypto";
import { and, desc, eq, gt, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/db";
import { oauthClients, oauthGrants, oauthTokens, users } from "@/lib/db/schema";
import { ownerEmail } from "@/lib/config";
import {
  ACCESS_TOKEN_SECONDS,
  CODE_SECONDS,
  REFRESH_TOKEN_SECONDS,
  SCOPE,
  checkAuthorizeParams,
  hashToken,
  isAllowedRedirect,
  isMetadataClientId,
  newToken,
  pkceMatches,
  type AuthorizeQuery,
} from "./rules";

// The connector's OAuth state: clients, connections (grants), codes and tokens. Spec:
// docs/architecture/engineering-claude-connector.md, section 3. Every token check re-reads the grant and the owner, so
// Disconnect works at once.

/** A problem the OAuth endpoints answer with, as an RFC 6749 error code. */
export class OAuthError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/** Registrations accepted per day. The endpoint is public, so this stops anyone filling the table. */
const REGISTRATIONS_PER_DAY = 20;
/** A client metadata document is read again after this long. */
const METADATA_TTL_MS = 24 * 60 * 60 * 1000;
const METADATA_MAX_BYTES = 10_000;

const seconds = (n: number) => new Date(Date.now() + n * 1000);

type Client = typeof oauthClients.$inferSelect;

/** Dynamic client registration (RFC 7591): a public client whose redirect URIs are all on allowed hosts. */
export async function registerClient(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;
  const redirectUris = input.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    !redirectUris.length ||
    redirectUris.length > 5 ||
    !redirectUris.every((uri) => isAllowedRedirect(uri))
  ) {
    throw new OAuthError("invalid_redirect_uri", "Redirect URIs must be https on an allowed host");
  }
  const method = input.token_endpoint_auth_method ?? "none";
  if (method !== "none")
    throw new OAuthError(
      "invalid_client_metadata",
      "Only public clients (token_endpoint_auth_method none) are supported",
    );
  const [recent] = await db()
    .select({ n: sql<number>`count(*)::int` })
    .from(oauthClients)
    .where(and(eq(oauthClients.kind, "registered"), gte(oauthClients.createdAt, seconds(-24 * 60 * 60))));
  if ((recent?.n ?? 0) >= REGISTRATIONS_PER_DAY)
    throw new OAuthError("temporarily_unavailable", "Too many registrations today", 429);
  const name =
    typeof input.client_name === "string" && input.client_name.trim()
      ? input.client_name.trim().slice(0, 100)
      : "Unnamed app";
  const client = {
    id: `kos_client_${randomUUID()}`,
    kind: "registered" as const,
    name,
    redirectUris: redirectUris as string[],
  };
  await db().insert(oauthClients).values(client);
  return {
    client_id: client.id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: client.name,
    redirect_uris: client.redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
    scope: SCOPE,
  };
}

/**
 * Reads a client metadata document (CIMD). Only URLs on allowed hosts are ever fetched, with a short timeout, a size
 * cap and no redirects, and the document must name itself.
 */
async function fetchMetadata(clientId: string): Promise<Pick<Client, "name" | "redirectUris">> {
  let response: Response;
  try {
    response = await fetch(clientId, {
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new OAuthError("invalid_client", "Couldn't read the client's metadata");
  }
  const text = response.ok ? await response.text() : "";
  if (!text || text.length > METADATA_MAX_BYTES)
    throw new OAuthError("invalid_client", "Couldn't read the client's metadata");
  let document: Record<string, unknown>;
  try {
    document = JSON.parse(text);
  } catch {
    throw new OAuthError("invalid_client", "The client's metadata isn't JSON");
  }
  if (document.client_id !== clientId)
    throw new OAuthError("invalid_client", "The client's metadata names another client");
  const redirectUris = Array.isArray(document.redirect_uris)
    ? document.redirect_uris.filter((uri) => isAllowedRedirect(uri))
    : [];
  if (!redirectUris.length) throw new OAuthError("invalid_client", "The client has no allowed redirect URI");
  const name =
    typeof document.client_name === "string" && document.client_name.trim()
      ? document.client_name.trim().slice(0, 100)
      : new URL(clientId).hostname;
  return { name, redirectUris: redirectUris as string[] };
}

/** The client behind a client_id: a registered one, or a metadata URL read (and kept for a day). */
export async function findClient(clientId: unknown): Promise<Client> {
  if (typeof clientId !== "string" || !clientId) throw new OAuthError("invalid_client", "client_id is required");
  const [stored] = await db().select().from(oauthClients).where(eq(oauthClients.id, clientId)).limit(1);
  if (stored?.kind === "registered") return stored;
  if (!isMetadataClientId(clientId)) throw new OAuthError("invalid_client", "Unknown client");
  if (stored?.fetchedAt && Date.now() - stored.fetchedAt.getTime() < METADATA_TTL_MS) return stored;
  const metadata = await fetchMetadata(clientId);
  const fetchedAt = new Date();
  const [saved] = await db()
    .insert(oauthClients)
    .values({ id: clientId, kind: "metadata", ...metadata, fetchedAt })
    .onConflictDoUpdate({ target: oauthClients.id, set: { ...metadata, fetchedAt } })
    .returning();
  return saved;
}

/** An authorize request that checked out: shown on the consent page, then turned into a code on Allow. */
export interface Authorization {
  client: { id: string; name: string };
  redirectUri: string;
  codeChallenge: string;
  state?: string;
}

/**
 * Checks an authorize request. `fatal` errors are shown on the page, because the redirect URI can't be trusted yet;
 * `redirect` errors go back to the client.
 */
export async function checkAuthorization(
  query: AuthorizeQuery,
  appUrl: string,
): Promise<
  { ok: Authorization } | { fatal: string } | { redirect: string; error: string; description: string; state?: string }
> {
  let client: Client;
  try {
    client = await findClient(query.client_id);
  } catch (error) {
    return { fatal: error instanceof OAuthError ? error.message : "Unknown client" };
  }
  if (
    !query.redirect_uri ||
    !client.redirectUris.includes(query.redirect_uri) ||
    !isAllowedRedirect(query.redirect_uri)
  ) {
    return { fatal: "The redirect address isn't one this app registered" };
  }
  const problem = checkAuthorizeParams(query, appUrl);
  if (problem)
    return { redirect: query.redirect_uri, error: problem.error, description: problem.description, state: query.state };
  return {
    ok: {
      client: { id: client.id, name: client.name },
      redirectUri: query.redirect_uri,
      codeChallenge: query.code_challenge!,
      state: query.state,
    },
  };
}

/** Allow on the consent page: a new connection and a one-time code for it. */
export async function issueCode(userId: string, authorization: Authorization) {
  const code = newToken("kos_code");
  const grantId = randomUUID();
  await db().transaction(async (tx) => {
    await tx.insert(oauthGrants).values({
      id: grantId,
      userId,
      clientId: authorization.client.id,
      scope: SCOPE,
      expiresAt: seconds(CODE_SECONDS),
    });
    await tx.insert(oauthTokens).values({
      hash: hashToken(code),
      kind: "code",
      grantId,
      redirectUri: authorization.redirectUri,
      codeChallenge: authorization.codeChallenge,
      expiresAt: seconds(CODE_SECONDS),
    });
  });
  return code;
}

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];

async function issueTokens(tx: Tx, grantId: string) {
  const access = newToken("kos_at");
  const refresh = newToken("kos_rt");
  const refreshExpires = seconds(REFRESH_TOKEN_SECONDS);
  await tx.insert(oauthTokens).values([
    { hash: hashToken(access), kind: "access", grantId, expiresAt: seconds(ACCESS_TOKEN_SECONDS) },
    { hash: hashToken(refresh), kind: "refresh", grantId, expiresAt: refreshExpires },
  ]);
  await tx
    .update(oauthGrants)
    .set({ expiresAt: refreshExpires, lastUsedAt: new Date() })
    .where(eq(oauthGrants.id, grantId));
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_SECONDS,
    refresh_token: refresh,
    scope: SCOPE,
  };
}

/** Uses up a one-time code or refresh token. Returns the row only if this call is the one that used it. */
async function useOnce(tx: Tx, token: unknown, kind: "code" | "refresh") {
  if (typeof token !== "string" || !token) return null;
  const [row] = await tx
    .update(oauthTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(oauthTokens.hash, hashToken(token)),
        eq(oauthTokens.kind, kind),
        isNull(oauthTokens.usedAt),
        gt(oauthTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return row ?? null;
}

async function liveGrant(tx: Tx, grantId: string, clientId: unknown) {
  const [grant] = await tx.select().from(oauthGrants).where(eq(oauthGrants.id, grantId)).limit(1);
  if (!grant || grant.revokedAt || grant.clientId !== clientId) return null;
  return grant;
}

/** The token endpoint's authorization_code grant: the code, its redirect URI, the PKCE verifier and the same client. */
export async function exchangeCode(input: {
  code: unknown;
  redirectUri: unknown;
  clientId: unknown;
  verifier: unknown;
}) {
  return db().transaction(async (tx) => {
    const code = await useOnce(tx, input.code, "code");
    if (!code) throw new OAuthError("invalid_grant", "The code is invalid, used or expired");
    const grant = await liveGrant(tx, code.grantId, input.clientId);
    if (!grant || input.redirectUri !== code.redirectUri)
      throw new OAuthError("invalid_grant", "The code was issued to another client or redirect URI");
    if (!pkceMatches(input.verifier, code.codeChallenge ?? ""))
      throw new OAuthError("invalid_grant", "PKCE verification failed");
    return issueTokens(tx, grant.id);
  });
}

/**
 * The refresh_token grant, rotating: the old refresh token stops working and a new pair is issued. A refresh token
 * used twice means it leaked, so the whole connection is revoked.
 */
export async function refreshTokens(input: { refreshToken: unknown; clientId: unknown }) {
  const outcome = await db().transaction(async (tx) => {
    const refresh = await useOnce(tx, input.refreshToken, "refresh");
    if (refresh) {
      const grant = await liveGrant(tx, refresh.grantId, input.clientId);
      return grant ? { tokens: await issueTokens(tx, grant.id) } : { reused: null };
    }
    if (typeof input.refreshToken !== "string") return { reused: null };
    const [spent] = await tx
      .select({ grantId: oauthTokens.grantId })
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.hash, hashToken(input.refreshToken)),
          eq(oauthTokens.kind, "refresh"),
          isNotNull(oauthTokens.usedAt),
        ),
      )
      .limit(1);
    return { reused: spent?.grantId ?? null };
  });
  if ("tokens" in outcome) return outcome.tokens;
  if (outcome.reused)
    await db().update(oauthGrants).set({ revokedAt: new Date() }).where(eq(oauthGrants.id, outcome.reused));
  throw new OAuthError("invalid_grant", "The refresh token is invalid, used or expired");
}

/**
 * Checks a bearer token on /api/mcp: an unexpired access token, a connection not disconnected, and a user who is
 * still the owner. Null means answer 401.
 */
export async function verifyAccessToken(header: string | null): Promise<{ userId: string; grantId: string } | null> {
  const match = header?.match(/^Bearer ([A-Za-z0-9_\-.~]+)$/);
  if (!match) return null;
  const [row] = await db()
    .select({
      grantId: oauthGrants.id,
      userId: oauthGrants.userId,
      email: users.email,
      lastUsedAt: oauthGrants.lastUsedAt,
    })
    .from(oauthTokens)
    .innerJoin(oauthGrants, eq(oauthGrants.id, oauthTokens.grantId))
    .innerJoin(users, eq(users.id, oauthGrants.userId))
    .where(
      and(
        eq(oauthTokens.hash, hashToken(match[1])),
        eq(oauthTokens.kind, "access"),
        gt(oauthTokens.expiresAt, new Date()),
        isNull(oauthGrants.revokedAt),
      ),
    )
    .limit(1);
  if (!row || row.email.trim().toLowerCase() !== ownerEmail()) return null;
  // Last used, to the minute: enough for the Connections list without a write on every call.
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await db().update(oauthGrants).set({ lastUsedAt: new Date() }).where(eq(oauthGrants.id, row.grantId));
  }
  return { userId: row.userId, grantId: row.grantId };
}

export interface Connection {
  id: string;
  name: string;
  host: string;
  connectedAt: string;
  lastUsedAt: string | null;
}

/** The owner's live connections, newest first: allowed, exchanged for tokens, not disconnected and not expired. */
export async function listConnections(userId: string): Promise<Connection[]> {
  const rows = await db()
    .select({
      id: oauthGrants.id,
      name: oauthClients.name,
      clientId: oauthClients.id,
      redirectUris: oauthClients.redirectUris,
      createdAt: oauthGrants.createdAt,
      lastUsedAt: oauthGrants.lastUsedAt,
    })
    .from(oauthGrants)
    .innerJoin(oauthClients, eq(oauthClients.id, oauthGrants.clientId))
    .where(
      and(
        eq(oauthGrants.userId, userId),
        isNull(oauthGrants.revokedAt),
        gt(oauthGrants.expiresAt, new Date()),
        isNotNull(oauthGrants.lastUsedAt),
      ),
    )
    .orderBy(desc(oauthGrants.createdAt));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    host: new URL(row.clientId.startsWith("https://") ? row.clientId : row.redirectUris[0]).hostname,
    connectedAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
  }));
}

/** Disconnect: the connection and every token under it stop working at once. */
export async function disconnect(userId: string, grantId: string) {
  const revoked = await db()
    .update(oauthGrants)
    .set({ revokedAt: new Date() })
    .where(and(eq(oauthGrants.id, grantId), eq(oauthGrants.userId, userId), isNull(oauthGrants.revokedAt)))
    .returning({ id: oauthGrants.id });
  return { disconnected: revoked.length > 0 };
}
