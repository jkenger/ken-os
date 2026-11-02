export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

/** APP_URL, or on a Vercel preview without one, the preview's branch URL. */
export function appUrl(): string {
  return (process.env.APP_URL || previewUrl() || requiredEnv("APP_URL")).replace(/\/$/, "");
}

function previewUrl(): string | undefined {
  const branch = process.env.VERCEL_BRANCH_URL;
  return process.env.VERCEL_ENV === "preview" && branch ? `https://${branch}` : undefined;
}

export function ownerEmail(): string {
  return requiredEnv("OWNER_EMAIL").trim().toLowerCase();
}

/** The first variable sign-in needs that isn't set, or null when sign-in can start. */
export function signInSetupGap(): string | null {
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) if (!process.env[name]) return name;
  if (!process.env.APP_URL && !previewUrl()) return "APP_URL";
  return null;
}

export function ownerEmailIsConfigured(): boolean {
  const value = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(value && value !== "you@example.com");
}
