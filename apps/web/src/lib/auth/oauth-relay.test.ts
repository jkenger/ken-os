import assert from "node:assert/strict";
import { test } from "node:test";
import { appUrl, signInSetupGap } from "../config";
import { googleCallbackUrl, isRelayOrigin, relayTarget, signState, stateOrigin } from "./oauth-relay";

// docs/architecture/auth-sign-in.md §11.

process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-bytes-long";
const production = "https://ken-os-web.vercel.app";
const branch = "https://ken-os-web-git-claude-feature-jkengers-projects.vercel.app";

function withEnv(env: Record<string, string | undefined>, run: () => void) {
  const saved = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const answer = (state: string, extra: Record<string, string> = { code: "4/abc", scope: "openid email" }) =>
  new URLSearchParams({ ...extra, state });

test("only this project's preview hosts can receive a relayed answer", () => {
  for (const origin of [
    branch,
    "https://ken-os-oztx9z3w6-jkengers-projects.vercel.app",
    "https://ken-os-preview.vercel.app",
  ]) {
    assert.ok(isRelayOrigin(origin), origin);
  }
  for (const origin of [
    "http://ken-os-web-git-x-jkengers-projects.vercel.app",
    "https://ken-os-web-git-x-jkengers-projects.vercel.app.evil.com",
    "https://evil-ken-os-web-git-x-jkengers-projects.vercel.app",
    "https://ken-os-web-git-x-someone-else.vercel.app",
    "https://ken-os-web-git-x-jkengers-projects.vercel.app/path",
    "https://ken-os-web-git-x-jkengers-projects.vercel.app:8443",
    "https://user@ken-os-preview.vercel.app",
    "https://evil.com",
    "javascript:alert(1)",
    "",
  ]) {
    assert.equal(isRelayOrigin(origin), false, origin);
  }
});

test("a signed state carries its origin, and any change to it is refused", () => {
  const state = signState(branch);
  assert.equal(stateOrigin(state), branch);
  assert.notEqual(signState(branch), state);
  const [nonce, , signature] = state.split(".");
  const forged = `${nonce}.${Buffer.from("https://ken-os-evil-jkengers-projects.vercel.app").toString("base64url")}.${signature}`;
  assert.equal(stateOrigin(forged), null);
  for (const value of [`${state}x`, state.slice(0, -2), `${state}.x`, "random", "", null, undefined]) {
    assert.equal(stateOrigin(value), null, String(value));
  }
});

test("a state signed with another secret is refused", () => {
  let state = "";
  withEnv({ SESSION_SECRET: "another-secret-that-is-at-least-32-bytes" }, () => (state = signState(branch)));
  assert.equal(stateOrigin(state), null);
});

test("production relays a preview's answer, with every query parameter, to that preview's callback", () => {
  const state = signState(branch);
  const target = relayTarget(answer(state), production);
  assert.ok(target);
  const url = new URL(target);
  assert.equal(url.origin, branch);
  assert.equal(url.pathname, "/api/auth/google/callback");
  assert.equal(url.searchParams.get("code"), "4/abc");
  assert.equal(url.searchParams.get("scope"), "openid email");
  assert.equal(url.searchParams.get("state"), state);
  const denied = relayTarget(answer(state, { error: "access_denied" }), production);
  assert.equal(new URL(denied!).searchParams.get("error"), "access_denied");
});

test("an answer is finished here when it is this app's own, forged, unsigned or for another host", () => {
  assert.equal(relayTarget(answer(signState(production)), production), null);
  assert.equal(relayTarget(answer(signState(branch)), branch), null);
  assert.equal(relayTarget(answer(signState("https://evil.com")), production), null);
  assert.equal(relayTarget(answer("random-unsigned-state"), production), null);
  assert.equal(relayTarget(new URLSearchParams({ code: "4/abc" }), production), null);
});

test("a preview sends production's callback to Google and falls back to its branch URL", () => {
  withEnv(
    {
      VERCEL_ENV: "preview",
      VERCEL_PROJECT_PRODUCTION_URL: "ken-os-web.vercel.app",
      VERCEL_BRANCH_URL: new URL(branch).host,
      APP_URL: undefined,
    },
    () => {
      assert.equal(googleCallbackUrl(), `${production}/api/auth/google/callback`);
      assert.equal(appUrl(), branch);
    },
  );
  withEnv({ VERCEL_ENV: "preview", APP_URL: "https://ken-os-preview.vercel.app/" }, () =>
    assert.equal(appUrl(), "https://ken-os-preview.vercel.app"),
  );
});

test("production and local development send their own callback", () => {
  withEnv(
    { VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "ken-os-web.vercel.app", APP_URL: production },
    () => assert.equal(googleCallbackUrl(), `${production}/api/auth/google/callback`),
  );
  withEnv({ VERCEL_ENV: undefined, VERCEL_BRANCH_URL: undefined, APP_URL: "http://localhost:3000" }, () =>
    assert.equal(googleCallbackUrl(), "http://localhost:3000/api/auth/google/callback"),
  );
});

test("sign-in still reports a missing APP_URL outside a preview", () => {
  withEnv(
    {
      OWNER_EMAIL: "owner@example.test",
      GOOGLE_CLIENT_ID: "id",
      GOOGLE_CLIENT_SECRET: "secret",
      APP_URL: undefined,
      VERCEL_ENV: undefined,
      VERCEL_BRANCH_URL: undefined,
    },
    () => {
      assert.equal(signInSetupGap(), "APP_URL");
      withEnv({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: new URL(branch).host }, () =>
        assert.equal(signInSetupGap(), null),
      );
    },
  );
});
