import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db/db";
import { labTopicEvents, oauthClients, users } from "../src/lib/db/schema";

config({ path: ".env.local" });
config({ path: ".env" });

// Database check for the Claude connector's sign-in and /api/mcp, with no network calls and no AI.
// Spec: docs/architecture/engineering-claude-connector.md, section 3. Run with: pnpm --filter @ken-os/web test:db:connector
// Two throwaway accounts stand in for two unrelated signed-in users; any account can connect its own Claude.

const APP = "https://ken-os.example";
const CALLBACK = "https://claude.ai/api/mcp/auth_callback";

async function main() {
  process.env.APP_URL = APP;
  process.env.MCP_ALLOWED_REDIRECT_HOSTS = "claude.ai,claude.com";
  const owner = `connector-check-${randomUUID()}`;
  const ownerEmail = `${owner}@example.invalid`;

  const store = await import("../src/features/connector/oauth-store");
  const tools = await import("../src/features/engineering-lab/agent-tools");
  const mcp = await import("../src/app/api/mcp/route");
  const token = await import("../src/app/api/oauth/token/route");

  await db().insert(users).values({ id: owner, email: ownerEmail, name: "Connector check" });
  let clientId = "";
  try {
    // Registration (DCR): public clients with claude.ai redirects only.
    await assert.rejects(store.registerClient({ redirect_uris: ["https://evil.example/cb"] }), /allowed host/);
    await assert.rejects(
      store.registerClient({ redirect_uris: [CALLBACK], token_endpoint_auth_method: "client_secret_post" }),
      /public clients/,
    );
    const registered = await store.registerClient({ redirect_uris: [CALLBACK], client_name: "Claude" });
    clientId = registered.client_id;
    assert.equal(registered.token_endpoint_auth_method, "none");
    console.log("ok - registration takes public clients with claude.ai redirects only");

    // Authorize: unknown clients and unregistered redirects never get redirected to.
    const verifier = randomUUID() + randomUUID();
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const query = {
      response_type: "code",
      client_id: clientId,
      redirect_uri: CALLBACK,
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "s1",
      scope: "engineering",
    };
    assert.ok("fatal" in (await store.checkAuthorization({ ...query, client_id: "kos_client_nope" }, APP)));
    assert.ok("fatal" in (await store.checkAuthorization({ ...query, redirect_uri: "https://claude.ai/other" }, APP)));
    const noPkce = await store.checkAuthorization({ ...query, code_challenge_method: "plain" }, APP);
    assert.ok("redirect" in noPkce && noPkce.error === "invalid_request");
    const checked = await store.checkAuthorization(query, APP);
    assert.ok("ok" in checked);
    console.log("ok - authorize refuses unknown clients, unregistered redirects and missing PKCE");

    // Token: the code works once, with the right verifier, redirect and client.
    const form = (fields: Record<string, string>) =>
      token.POST(
        new Request(`${APP}/api/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(fields),
        }),
      );
    const code = await store.issueCode(owner, checked.ok);
    let response = await form({
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK,
      client_id: clientId,
      code_verifier: "x".repeat(43),
    });
    assert.equal((await response.json()).error, "invalid_grant", "a wrong verifier fails");
    response = await form({
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK,
      client_id: clientId,
      code_verifier: verifier,
    });
    const tokens = await response.json();
    assert.equal(response.status, 200);
    assert.equal(tokens.token_type, "Bearer");
    assert.equal(tokens.expires_in, 3600);
    response = await form({
      grant_type: "authorization_code",
      code,
      redirect_uri: CALLBACK,
      client_id: clientId,
      code_verifier: verifier,
    });
    assert.equal((await response.json()).error, "invalid_grant", "a code works once");
    const json = await token.POST(
      new Request(`${APP}/api/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      }),
    );
    assert.equal(json.status, 400, "the token endpoint takes form posts");
    console.log("ok - a code is exchanged once, with PKCE, for an hour-long access token and a refresh token");

    // /api/mcp: 401 without a token, the tools with one.
    const rpc = (body: unknown, bearer?: string) =>
      mcp.POST(
        new Request(`${APP}/api/mcp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          },
          body: JSON.stringify(body),
        }),
      );
    const init = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check", version: "1" } },
    };
    const signedOut = await rpc(init);
    assert.equal(signedOut.status, 401);
    assert.match(signedOut.headers.get("WWW-Authenticate") ?? "", /resource_metadata=/);
    assert.equal((await rpc(init, "kos_at_wrong")).status, 401);
    const started = await rpc(init, tokens.access_token);
    assert.equal(started.status, 200);
    assert.equal((await started.json()).result.serverInfo.name, "ken-os-engineering");
    const list = await (await rpc({ jsonrpc: "2.0", id: 2, method: "tools/list" }, tokens.access_token)).json();
    assert.deepEqual(list.result.tools.map((tool: { name: string }) => tool.name).sort(), [
      "get_current_state",
      "get_history",
      "get_my_work",
      "get_roadmap",
      "get_topic",
      "report_progress",
      "save_exercise",
      "save_note",
      "save_review",
      "save_roadmap",
      "save_topic_material",
      "save_topic_plan",
    ]);
    const state = await (
      await rpc(
        { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "get_current_state", arguments: {} } },
        tokens.access_token,
      )
    ).json();
    assert.equal(state.result.isError, undefined);
    assert.equal(state.result.structuredContent.planned, false);
    const bad = await (
      await rpc(
        {
          jsonrpc: "2.0",
          id: 4,
          method: "tools/call",
          params: {
            name: "report_progress",
            arguments: { topicId: "js.closures", summary: "Got it", status: "learned" },
          },
        },
        tokens.access_token,
      )
    ).json();
    assert.equal(bad.result.isError, true, "a refused write is a tool error Claude can read");
    console.log("ok - /api/mcp answers 401 with resource_metadata, then lists and runs the tools");

    // Write limit: 40 saves a day across the write tools, reports and notes together.
    await db()
      .insert(labTopicEvents)
      .values(
        Array.from({ length: tools.CLAUDE_WRITE_LIMIT - 1 }, () => ({
          id: randomUUID(),
          userId: owner,
          topicId: "js.closures",
          kind: "report" as const,
          source: "claude" as const,
          summary: "Checked in",
        })),
      );
    const note = { topicId: "js.closures", body: "Say it captures the variable" };
    assert.ok(await tools.callAgentTool(owner, "save_note", note), "the 40th write works");
    await assert.rejects(tools.callAgentTool(owner, "save_note", note), /Out of writes for today \(40\)/);
    assert.ok(await tools.callAgentTool(owner, "get_current_state", {}), "reads still work");
    console.log("ok - the 41st write of the day is refused; reads continue");

    // Refresh: rotates; reusing an old refresh token revokes the connection.
    response = await form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId });
    const rotated = await response.json();
    assert.equal(response.status, 200);
    assert.notEqual(rotated.refresh_token, tokens.refresh_token);
    assert.equal((await rpc(init, rotated.access_token)).status, 200);
    response = await form({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId });
    assert.equal((await response.json()).error, "invalid_grant");
    assert.equal((await rpc(init, rotated.access_token)).status, 401, "a reused refresh token ends the connection");
    console.log("ok - refresh rotates, and a reused refresh token revokes the connection");

    // Connections and Disconnect.
    const again = await store.checkAuthorization(query, APP);
    assert.ok("ok" in again);
    const second = await (
      await form({
        grant_type: "authorization_code",
        code: await store.issueCode(owner, again.ok),
        redirect_uri: CALLBACK,
        client_id: clientId,
        code_verifier: verifier,
      })
    ).json();
    const connections = await store.listConnections(owner);
    assert.equal(connections.length, 1, "the revoked connection is gone, the new one is listed");
    assert.equal(connections[0].host, "claude.ai");
    assert.equal((await store.disconnect(owner, connections[0].id)).disconnected, true);
    assert.equal((await rpc(init, second.access_token)).status, 401, "Disconnect stops the connector at once");
    assert.deepEqual(await store.listConnections(owner), []);
    console.log("ok - Connections lists live connections, and Disconnect stops them at once");

    // Any account: a second, unrelated account gets its own connection scoped to its own roadmap -- the connector
    // isn't gated to one hardcoded account.
    const guest = `connector-check-guest-${randomUUID()}`;
    await db()
      .insert(users)
      .values({ id: guest, email: `${guest}@example.invalid`, name: "Guest" });
    try {
      const guestAuth = await store.checkAuthorization(query, APP);
      assert.ok("ok" in guestAuth);
      const guestTokens = await (
        await form({
          grant_type: "authorization_code",
          code: await store.issueCode(guest, guestAuth.ok),
          redirect_uri: CALLBACK,
          client_id: clientId,
          code_verifier: verifier,
        })
      ).json();
      const guestRpc = await (
        await rpc(
          { jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_current_state", arguments: {} } },
          guestTokens.access_token,
        )
      ).json();
      assert.equal(guestRpc.result.isError, undefined, "a non-owner account can connect and call tools");
      assert.equal(
        guestRpc.result.structuredContent.planned,
        false,
        "the guest sees their own, separate, empty roadmap",
      );
    } finally {
      await db().delete(users).where(eq(users.id, guest));
    }
    console.log("ok - a non-owner account connects on its own and only ever sees its own roadmap");
  } finally {
    await db().delete(users).where(eq(users.id, owner));
    if (clientId) await db().delete(oauthClients).where(eq(oauthClients.id, clientId));
    await closeDb();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
