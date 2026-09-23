import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { ownerEmail, requiredEnv } from "./config";

const COOKIE = "ken_os_session";
const WEEK = 60 * 60 * 24 * 7;

export interface Session {
  userId: string;
  email: string;
}

function secret(): Uint8Array {
  return new TextEncoder().encode(requiredEnv("SESSION_SECRET"));
}

export async function createSession(user: Session): Promise<void> {
  const token = await new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: WEEK,
  });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    if (payload.email.trim().toLowerCase() !== ownerEmail()) return null;
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}
