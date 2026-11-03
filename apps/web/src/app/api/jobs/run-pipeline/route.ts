import { JobsInputError, jobsRoute } from "@/features/jobs/api";
import { processUserPostings, scrapeFreehireForUser } from "@/features/jobs/pipeline";

export const runtime = "nodejs";

type StepResult = { step: string; ok: boolean; detail: string };

// Lets the signed-in account run the same scrape-then-process pipeline an outside scheduler polls every minute
// (docs/product/job-finder.md, "Getting postings in"; plans/jobs-freehire-source.md), for checking right now
// instead of waiting for the next poll, scoped to just that account -- not the whole scheduler's account list,
// which would spend every other account's AI calls on one person's click. The secret stays server-side and is
// only ever compared to itself, since this call never leaves the server.
export async function POST(request: Request) {
  return jobsRoute(request, async (session) => {
    const secret = process.env.JOBS_CHECK_SECRET;
    if (!secret) throw new JobsInputError("Pipeline isn't configured", 503);

    const steps: StepResult[] = [];
    try {
      const freehire = await scrapeFreehireForUser(session.userId, secret, secret);
      steps.push({
        step: "freehire",
        ok: freehire.ok,
        detail: freehire.ok ? `found ${freehire.found}` : freehire.reason,
      });
    } catch (error) {
      steps.push({ step: "freehire", ok: false, detail: error instanceof Error ? error.message : "failed" });
    }

    try {
      const result = await processUserPostings(session.userId, secret, secret);
      steps.push({ step: "Process", ok: true, detail: `processed ${result.extracted + result.scored}` });
    } catch (error) {
      steps.push({ step: "Process", ok: false, detail: error instanceof Error ? error.message : "failed" });
    }

    return { ranAt: new Date().toISOString(), steps };
  });
}
