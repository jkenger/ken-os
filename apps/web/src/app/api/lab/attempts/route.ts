import { labRoute, readJson, stringList } from "@/features/engineering-lab/api";
import { LabInputError, submitAnswer, submitLabRun, submitPractice } from "@/features/engineering-lab/store";

export const runtime = "nodejs";
export const maxDuration = 60;

const integer = (value: unknown, field: string) => {
  if (!Number.isInteger(value) || (value as number) < 0) throw new LabInputError(`${field} must be a whole number.`);
  return value as number;
};

const text = (value: unknown, field: string, max: number) => {
  if (typeof value !== "string" || value.length > max) throw new LabInputError(`${field} must be text up to ${max} characters.`);
  return value;
};

// One route for the three ways an answer arrives. Code-checked results (predict output, lab test results) are
// produced by the learner's own browser; the server re-grades them with the same rules rather than trusting a label.
export async function POST(request: Request) {
  return labRoute(request, async (session) => {
    const body = await readJson(request);
    if (body.type === "answer") {
      const response = (body.response ?? {}) as Record<string, unknown>;
      return submitAnswer(session.userId, {
        assessmentId: text(body.assessmentId, "assessmentId", 64),
        itemIndex: integer(body.itemIndex, "itemIndex"),
        selfRating: integer(body.selfRating, "selfRating"),
        response: {
          ...(response.text !== undefined ? { text: text(response.text, "response.text", 6000) } : {}),
          ...(response.lines !== undefined ? { lines: stringList(response.lines, "response.lines") } : {}),
          ...(response.why !== undefined ? { why: text(response.why, "response.why", 2000) } : {}),
        },
        ...(body.actualOutput !== undefined ? { actualOutput: stringList(body.actualOutput, "actualOutput", 200) } : {}),
      });
    }
    if (body.type === "practice") {
      return submitPractice(session.userId, {
        lessonId: text(body.lessonId, "lessonId", 64),
        practiceIndex: integer(body.practiceIndex, "practiceIndex"),
        lines: stringList(body.lines, "lines"),
        ...(body.why !== undefined ? { why: text(body.why, "why", 2000) } : {}),
        actualOutput: stringList(body.actualOutput, "actualOutput", 200),
      });
    }
    if (body.type === "lab") {
      const run = (body.run ?? {}) as Record<string, unknown>;
      return submitLabRun(session.userId, {
        labId: text(body.labId, "labId", 64),
        code: text(body.code, "code", 50_000),
        run: { passed: integer(run.passed, "run.passed"), failed: integer(run.failed, "run.failed"), output: text(run.output ?? "", "run.output", 10_000) },
      });
    }
    throw new LabInputError("type must be answer, practice or lab.");
  }, { write: true });
}
