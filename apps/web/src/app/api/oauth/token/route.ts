import { exchangeCode, OAuthError, refreshTokens } from "@/features/connector/oauth-store";
import { oauthError } from "@/features/connector/rules";

export const runtime = "nodejs";

/** The token endpoint: a code for tokens, or a refresh token for a new pair. Form-encoded, as RFC 6749 sends it. */
export async function POST(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("application/x-www-form-urlencoded"))
    return oauthError("invalid_request", "Send the form as application/x-www-form-urlencoded");
  const form = new URLSearchParams(await request.text());
  const get = (name: string) => form.get(name) ?? undefined;
  try {
    const grant = get("grant_type");
    const tokens =
      grant === "authorization_code"
        ? await exchangeCode({
            code: get("code"),
            redirectUri: get("redirect_uri"),
            clientId: get("client_id"),
            verifier: get("code_verifier"),
          })
        : grant === "refresh_token"
          ? await refreshTokens({ refreshToken: get("refresh_token"), clientId: get("client_id") })
          : null;
    if (!tokens) return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token");
    return Response.json(tokens, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
  } catch (error) {
    if (error instanceof OAuthError) return oauthError(error.code, error.message, error.status);
    console.error("oauth token failed", error instanceof Error ? error.message : error);
    return oauthError("server_error", "Token request failed", 500);
  }
}
