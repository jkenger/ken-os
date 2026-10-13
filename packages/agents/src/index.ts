import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
export { explainTerm, TERM_PROMPT_VERSION } from "./terms/explain";

export async function askResumeAgent(question: string, loadResume: () => Promise<string>): Promise<{ answer: string }> {
  const readResume = tool({
    name: "read_selected_resume",
    description: "Read the current content of the owner's selected resume.",
    parameters: z.object({}),
    execute: async () => (await loadResume()).slice(0, 60_000),
  });
  const agent = new Agent({
    name: "Resume assistant",
    instructions:
      "Help the owner understand and improve their resume. Read the selected resume before answering factual questions. Do not claim to have edited the file. Do not invent experience, achievements, or metrics. If evidence is missing, say so. Keep suggestions concrete and concise.",
    tools: [readResume],
  });
  const result = await run(agent, question);
  return { answer: String(result.finalOutput ?? "No response was generated.") };
}
