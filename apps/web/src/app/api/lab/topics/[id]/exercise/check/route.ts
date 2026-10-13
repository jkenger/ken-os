import type { ExerciseCheckRuns } from "@ken-os/domain";
import { labRoute, readJson } from "@/features/engineering-lab/api";
import { recordCheck } from "@/features/engineering-lab/exercise-store";
import { LabInputError } from "@/features/engineering-lab/errors";

export const runtime = "nodejs";

function checkRun(value: unknown): ExerciseCheckRuns["solution"] {
  const run = (value ?? {}) as Record<string, unknown>;
  if (typeof run.error === "string") return { error: run.error.slice(0, 500) };
  if (!Array.isArray(run.results) || run.results.length > 100) throw new LabInputError("Check the exercise again");
  return {
    results: run.results.map((item) => {
      const test = (item ?? {}) as Record<string, unknown>;
      return {
        name: String(test.name ?? "").slice(0, 300),
        passed: test.passed === true,
        ...(typeof test.error === "string" ? { error: test.error.slice(0, 500) } : {}),
      };
    }),
  };
}

/** Stores the page's check of a new exercise version: its solution and starter, run in the browser. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return labRoute(
    request,
    async (session) => {
      const body = await readJson(request);
      return recordCheck(session.userId, (await params).id, String(body.labId ?? ""), {
        solution: checkRun(body.solution),
        starter: checkRun(body.starter),
      });
    },
    { write: true },
  );
}
