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

export function ownerEmailIsConfigured(): boolean {
  const value = process.env.OWNER_EMAIL?.trim().toLowerCase();
  return Boolean(value && value !== "you@example.com");
}
