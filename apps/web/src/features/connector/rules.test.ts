import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import {
  allowedHosts,
  authorizationServerMetadata,
  checkAuthorizeParams,
  hashToken,
  isAllowedRedirect,
  isMetadataClientId,
  newToken,
  pkceMatches,
  protectedResourceMetadata,
  unauthorized,
} from "./rules";

// The connector's OAuth rules (docs/architecture/engineering-claude-connector.md, section 3, Sign-in).

const app = "https://ken-os.example";

test("claude.ai can find the sign-in and pick its client metadata URL", () => {
  const resource = protectedResourceMetadata(app);
  assert.equal(resource.resource, "https://ken-os.example/api/mcp", "resource must equal the URL added in Claude");
  assert.deepEqual(resource.authorization_servers, [app]);
  const server = authorizationServerMetadata(app);
  assert.equal(server.client_id_metadata_document_supported, true);
  assert.deepEqual(server.token_endpoint_auth_methods_supported, ["none"], "claude.ai needs none to use CIMD");
  assert.deepEqual(server.code_challenge_methods_supported, ["S256"]);
  assert.equal(server.registration_endpoint, "https://ken-os.example/api/oauth/register");
});

test("an unauthenticated call gets the 401 that starts sign-in", async () => {
  const response = unauthorized(app);
  assert.equal(response.status, 401);
  assert.match(
    response.headers.get("WWW-Authenticate")!,
    /resource_metadata="https:\/\/ken-os.example\/.well-known\/oauth-protected-resource\/api\/mcp"/,
  );
  assert.equal((await response.json()).error, "invalid_token");
});

test("redirects and metadata URLs stay on claude.ai and claude.com, over https", () => {
  const hosts = allowedHosts(undefined);
  assert.deepEqual(hosts, ["claude.ai", "claude.com"]);
  assert.equal(isAllowedRedirect("https://claude.ai/api/mcp/auth_callback", hosts), true);
  for (const bad of [
    "http://claude.ai/api/mcp/auth_callback",
    "https://claude.ai.evil.example/cb",
    "https://evil.example/cb",
    "https://user@claude.ai/cb",
    "https://claude.ai:8443/cb",
    "https://claude.ai/cb#frag",
    "javascript:alert(1)",
  ]) {
    assert.equal(isAllowedRedirect(bad, hosts), false, bad);
  }
  assert.equal(isMetadataClientId("https://claude.ai/oauth/mcp-client-metadata", hosts), true);
  assert.equal(isMetadataClientId("https://claude.ai/", hosts), false, "a bare origin isn't a document");
  assert.equal(isMetadataClientId("https://169.254.169.254/latest", hosts), false, "nothing else is ever fetched");
  assert.deepEqual(allowedHosts(" Claude.AI , "), ["claude.ai"]);
});

test("PKCE is S256 only, and tokens are stored as hashes", () => {
  const verifier = "a".repeat(43);
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  assert.equal(pkceMatches(verifier, challenge), true);
  assert.equal(pkceMatches("b".repeat(43), challenge), false);
  assert.equal(pkceMatches("short", challenge), false);
  const token = newToken("kos_at");
  assert.match(token, /^kos_at_[A-Za-z0-9_-]{43}$/);
  assert.notEqual(hashToken(token), token);
  assert.equal(hashToken(token), hashToken(token));
});

test("authorize requests need the code flow, S256, the one scope and this resource", () => {
  const good = {
    response_type: "code",
    code_challenge: "x".repeat(43),
    code_challenge_method: "S256",
    scope: "engineering offline_access",
  };
  assert.equal(checkAuthorizeParams(good, app), null);
  assert.equal(
    checkAuthorizeParams({ ...good, scope: undefined, resource: "https://ken-os.example/api/mcp/" }, app),
    null,
  );
  assert.equal(checkAuthorizeParams({ ...good, response_type: "token" }, app)?.error, "unsupported_response_type");
  assert.equal(checkAuthorizeParams({ ...good, code_challenge_method: "plain" }, app)?.error, "invalid_request");
  assert.equal(checkAuthorizeParams({ ...good, scope: "engineering admin" }, app)?.error, "invalid_scope");
  assert.equal(
    checkAuthorizeParams({ ...good, resource: "https://other.example/api/mcp" }, app)?.error,
    "invalid_target",
  );
});
