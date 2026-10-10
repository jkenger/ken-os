export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function appUrl(): string {
  return requiredEnv("APP_URL").replace(/\/$/, "");
}

export function ownerEmail(): string {
  return requiredEnv("OWNER_EMAIL").trim().toLowerCase();
}

/** The first variable sign-in needs that isn't set, or null when sign-in can start. */
export function signInSetupGap(): string | null {
  if (!ownerEmailIsConfigured()) return "OWNER_EMAIL";
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APP_URL"]) if (!process.env[name]) return name;
  return null;
}

export function ownerEmailIsConfigured(): boolean {
  const value = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(value && value !== "you@example.com");
}
