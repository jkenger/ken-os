import { redirect } from "next/navigation";
import { legacyLabPath } from "./routes";

type Search = Record<string, string | string[] | undefined>;

/**
 * Sends an old /lab page to its Engineering page with the same query. A temporary (307) redirect until the rollback
 * window closes (docs/architecture/engineering-redesign.md, section 3). Only pages use this; /api/lab keeps its address.
 */
export async function redirectFromLab(pathname: string, searchParams: Promise<Search>): Promise<never> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, item);
  }
  const query = params.toString();
  redirect(legacyLabPath(pathname, query ? `?${query}` : "") ?? "/engineering");
}
