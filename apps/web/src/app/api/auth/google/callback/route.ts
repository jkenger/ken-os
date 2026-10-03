import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { appUrl, ownerEmail, requiredEnv } from "@/lib/config";
import { db } from "@/lib/db";
import { encryptToken } from "@/lib/google";
import { createSession } from "@/lib/session";
import { googleConnections, users } from "@/lib/schema";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = request.cookies.get("ken_os_oauth_state")?.value;
  const verifier = request.cookies.get("ken_os_oauth_verifier")?.value;
  if (!code || !state || !storedState || state !== storedState || !verifier) {
    return NextResponse.json(
      { error: "Sign-in expired. Sign in again" },
      { status: 400 },
    );
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: requiredEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
    cache: "no-store",
  });
  if (!tokenResponse.ok) {
    const tokenError = (await tokenResponse.json().catch(() => null)) as { error?: string } | null;
    return NextResponse.json(
      {
        error: tokenError?.error === "invalid_grant"
          ? "Sign-in expired. Sign in again"
          : "Google sign-in failed. Sign in again",
      },
      { status: 400 },
    );
  }
  const tokens = (await tokenResponse.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
  };
  if (!tokens.access_token)
    return NextResponse.json(
      { error: "Google didn't finish sign-in. Sign in again" },
      { status: 400 },
    );
  if (!tokens.scope?.split(" ").includes("https://www.googleapis.com/auth/drive.file")) {
    return NextResponse.json(
      { error: "Drive access wasn't allowed. Sign in again and allow it" },
      { status: 403 },
    );
  }
  const userResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    },
  );
  if (!userResponse.ok)
    return NextResponse.json(
      { error: "Couldn't verify your Google account. Sign in again" },
      { status: 400 },
    );
  const profile = (await userResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };
  if (
    !profile.sub ||
    !profile.email_verified ||
    profile.email?.trim().toLowerCase() !== ownerEmail()
  ) {
    return NextResponse.json(
      { error: "This Google account doesn't have access" },
      { status: 403 },
    );
  }
  await db().insert(users).values({
    id: profile.sub,
    email: profile.email,
    name: profile.name ?? null,
  }).onConflictDoUpdate({
    target: users.id,
    set: { email: profile.email, name: profile.name ?? null },
  });
  if (tokens.refresh_token) {
    const encryptedRefreshToken = encryptToken(tokens.refresh_token);
    await db().insert(googleConnections).values({
      userId: profile.sub,
      encryptedRefreshToken,
    }).onConflictDoUpdate({
      target: googleConnections.userId,
      set: { encryptedRefreshToken, updatedAt: sql`now()` },
    });
  } else {
    const existing = await db().select({ userId: googleConnections.userId })
      .from(googleConnections).where(eq(googleConnections.userId, profile.sub)).limit(1);
    if (!existing[0])
      return NextResponse.json(
        { error: "Google didn't keep you signed in. Sign in again" },
        { status: 400 },
      );
  }
  await createSession({ userId: profile.sub, email: profile.email });
  const response = NextResponse.redirect(appUrl());
  response.cookies.delete("ken_os_oauth_state");
  response.cookies.delete("ken_os_oauth_verifier");
  return response;
}
