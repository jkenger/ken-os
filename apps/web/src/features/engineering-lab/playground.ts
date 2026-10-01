// Practice endpoints for Module 2 probes. They hold no data, need no session, and only ever set kos_lab_* cookies,
// so they are safe to reach anonymously. That matters: the CORS probe calls them from the code box's opaque origin.

export const LAB_COOKIE_PREFIX = "kos_lab_";

export function labCookieNames(header: string | null) {
  return (header ?? "").split(";").map((part) => part.trim().split("=")[0]).filter((name) => name.startsWith(LAB_COOKIE_PREFIX)).sort();
}

export function json(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { ...init, headers });
}
