import { OAuthError, registerClient } from "@/features/connector/oauth-store";
import { oauthError } from "@/features/connector/rules";

export const runtime = "nodejs";

/** Dynamic client registration (RFC 7591), for clients that don't use a metadata URL. Public clients only. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    return Response.json(await registerClient(body), { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OAuthError) return oauthError(error.code, error.message, error.status);
    console.error("oauth register failed", error instanceof Error ? error.message : error);
    return oauthError("server_error", "Registration failed", 500);
  }
}
