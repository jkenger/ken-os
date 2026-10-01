import { json, labCookieNames } from "@/features/engineering-lab/playground";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lives under the path that kos_lab_path is scoped to.
export async function GET(request: Request) {
  return json({ received: labCookieNames(request.headers.get("cookie")) });
}
