import { checkAuthorization, issueCode } from "@/features/connector/oauth-store";
import { redirectWith, type AuthorizeQuery } from "@/features/connector/rules";
import { appUrl } from "@/lib/config";
import { messages } from "@/lib/messages";
import { hasValidOrigin } from "@/lib/origin";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const FIELDS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
  "resource",
] as const;

/**
 * Allow or Deny on the consent page. The request is checked again from scratch, never trusted from the page, and the
 * answer is where to send the browser: back to the client with a code, or with access_denied.
 */
export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return Response.json({ error: messages.invalidOrigin }, { status: 403 });
  const session = await getSession();
  if (!session) return Response.json({ error: messages.signedOut }, { status: 401 });
  const body = ((await request.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const query: AuthorizeQuery = {};
  for (const field of FIELDS) if (typeof body[field] === "string") query[field] = body[field] as string;
  const checked = await checkAuthorization(query, appUrl());
  if ("fatal" in checked) return Response.json({ error: checked.fatal }, { status: 400 });
  if ("redirect" in checked) {
    return Response.json({
      redirect: redirectWith(checked.redirect, {
        error: checked.error,
        error_description: checked.description,
        state: checked.state,
        iss: appUrl(),
      }),
    });
  }
  const { ok } = checked;
  if (body.decision !== "allow") {
    return Response.json({
      redirect: redirectWith(ok.redirectUri, { error: "access_denied", state: ok.state, iss: appUrl() }),
    });
  }
  const code = await issueCode(session.userId, ok);
  return Response.json(
    { redirect: redirectWith(ok.redirectUri, { code, state: ok.state, iss: appUrl() }) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
