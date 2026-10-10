import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, renewSession, sessionCookieOptions } from "@/lib/session";

/**
 * Renews the session cookie on page visits, at most once a day (docs/architecture/auth-sign-in.md §5). It never
 * decides access: a missing or invalid session passes straight through, and the page's `requireSession` redirects.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return response;
  const renewed = await renewSession(token);
  if (renewed) response.cookies.set(SESSION_COOKIE, renewed.token, sessionCookieOptions(renewed.maxAge));
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, Next.js internals, files with an extension, or the sign-in page.
      source: "/((?!api/|api$|_next/|sign-in(?:/|$)|.*\\..*).*)",
      has: [{ type: "cookie", key: "ken_os_session" }],
    },
  ],
};
