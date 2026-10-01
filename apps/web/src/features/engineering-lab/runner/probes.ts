"use client";

import { buildProbeScript } from "./harness";
import { runInWorker } from "./run-in-worker";

// Built-in probes for Module 2. Each runs real requests against the practice endpoints and reports what actually
// happened, answer by answer. The learner's predictions are scored against these observations, never against a key.

type Observed = Record<string, string>;
const yesNo = (value: boolean) => (value ? "yes" : "no");
const BASE = "/api/lab/playground";

async function getJson(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: "no-store", ...init });
  return response.json() as Promise<Record<string, unknown>>;
}

/** Runs code in the code box's worker, whose origin is opaque, so its requests to Ken OS are cross-site. */
async function fromOtherSite(code: string): Promise<Record<string, unknown>> {
  const outcome = await runInWorker(buildProbeScript(code, window.location.origin), 8000);
  if (outcome.type !== "output") throw new Error(outcome.type === "timeout" || outcome.type === "error" ? outcome.message : "The probe produced no result.");
  const line = outcome.logs.find((entry) => entry.startsWith("{"));
  if (!line) throw new Error("The probe produced no result.");
  return JSON.parse(line) as Record<string, unknown>;
}

async function requestAnatomy(): Promise<Observed> {
  document.cookie = "kos_lab_probe=1; path=/; max-age=600";
  const get = await getJson(`${BASE}/echo`);
  const post = await getJson(`${BASE}/echo`, { method: "POST" });
  return {
    get_origin: yesNo(Boolean(get.origin)),
    post_origin: yesNo(Boolean(post.origin)),
    sec_fetch_site: String(get.secFetchSite ?? "not sent"),
    cookies_by_default: yesNo(Array.isArray(get.labCookies) && get.labCookies.includes("kos_lab_probe")),
    encrypted: yesNo(window.location.protocol === "https:"),
  };
}

async function cookieRules(): Promise<Observed> {
  await getJson(`${BASE}/cookies?step=set`);
  const outside = (await getJson(`${BASE}/cookies`)).received as string[];
  const inside = (await getJson(`${BASE}/cookies/inner`)).received as string[];
  const visible = document.cookie.split(";").map((part) => part.trim().split("=")[0]);
  const crossSite = await fromOtherSite(`
    const response = await fetch(LAB_ORIGIN + "${BASE}/cookies", { credentials: "include" });
    console.log(JSON.stringify(await response.json()));
  `);
  return {
    basic_visible: yesNo(visible.includes("kos_lab_basic")),
    httponly_visible: yesNo(visible.includes("kos_lab_httponly")),
    httponly_sent: yesNo(outside.includes("kos_lab_httponly")),
    path_sent_outside: yesNo(outside.includes("kos_lab_path")),
    path_sent_inside: yesNo(inside.includes("kos_lab_path")),
    expired_sent: yesNo(outside.includes("kos_lab_expired") || inside.includes("kos_lab_expired")),
    cross_site_sent: yesNo(((crossSite.received as string[]) ?? []).includes("kos_lab_basic")),
  };
}

async function cacheRules(): Promise<Observed> {
  const run = crypto.randomUUID();
  const observe = async (policy: string) => {
    const url = new URL(`${BASE}/cache?policy=${policy}&run=${run}`, window.location.origin).toString();
    await fetch(url).then((response) => response.text());
    await fetch(url).then((response) => response.text());
    await new Promise((resolve) => setTimeout(resolve, 50));
    const entries = performance.getEntriesByName(url) as PerformanceResourceTiming[];
    const second = entries[entries.length - 1];
    if (!second || entries.length < 2) throw new Error("The browser didn't report timing for the requests.");
    return { reachedServer: second.transferSize > 0, fullBody: second.transferSize > 15_000 };
  };
  const maxAge = await observe("max-age");
  const noCache = await observe("no-cache");
  const noStore = await observe("no-store");
  return {
    maxage_server: yesNo(maxAge.reachedServer),
    nocache_server: yesNo(noCache.reachedServer),
    nocache_body: yesNo(noCache.fullBody),
    nostore_server: yesNo(noStore.reachedServer),
    nostore_body: yesNo(noStore.fullBody),
  };
}

async function corsRules(): Promise<Observed> {
  const result = await fromOtherSite(`
    const attempt = async (variant, init) => {
      try {
        const response = await fetch(LAB_ORIGIN + "${BASE}/cors?variant=" + variant, init);
        await response.json();
        return "yes";
      } catch { return "no"; }
    };
    console.log(JSON.stringify({
      none_readable: await attempt("none"),
      star_readable: await attempt("star"),
      star_credentials_readable: await attempt("star-credentials", { credentials: "include" }),
      echo_credentials_readable: await attempt("echo-credentials", { credentials: "include" }),
      custom_header_denied_readable: await attempt("preflight-denied", { headers: { "X-Lab-Token": "1" } }),
      custom_header_allowed_readable: await attempt("preflight-allowed", { headers: { "X-Lab-Token": "1" } }),
    }));
  `);
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key, String(value)]));
}

export const PROBES: Record<string, () => Promise<Observed>> = {
  "request-anatomy": requestAnatomy,
  "cookie-rules": cookieRules,
  "cache-rules": cacheRules,
  "cors-rules": corsRules,
};
