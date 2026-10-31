import { JobsInputError, jobsRoute } from "@/features/jobs/api";

export const runtime = "nodejs";

type StepResult = { step: string; ok: boolean; detail: string };

async function hit(origin: string, secret: string, path: string, step: string): Promise<StepResult> {
  const response = await fetch(`${origin}${path}`, { headers: { "x-jobs-check-secret": secret } });
  const body = (await response.json().catch(() => ({}))) as {
    reason?: string;
    error?: string;
    processed?: number;
  };
  const detail = body.error ?? (body.processed !== undefined ? `processed ${body.processed}` : (body.reason ?? "ok"));
  return { step, ok: response.ok, detail };
}

// Lets the signed-in owner run the same scrape-then-process pipeline an outside scheduler polls every minute
// (docs/product/job-finder.md, "Getting postings in"), for checking right now instead of waiting for the next
// poll, with a step-by-step result the button can show. The secret stays server-side -- the button only needs a
// valid session, never the secret itself.
export async function POST(request: Request) {
  return jobsRoute(request, async () => {
    const secret = process.env.JOBS_CHECK_SECRET;
    if (!secret) throw new JobsInputError("Pipeline isn't configured", 503);

    const origin = new URL(request.url).origin;
    const scrapeResults = await Promise.all([
      hit(origin, secret, "/api/jobs/check/linkedin", "LinkedIn"),
      hit(origin, secret, "/api/jobs/check/indeed", "Indeed"),
    ]);
    const processResult = await hit(origin, secret, "/api/jobs/process", "Process");
    return { ranAt: new Date().toISOString(), steps: [...scrapeResults, processResult] };
  });
}
