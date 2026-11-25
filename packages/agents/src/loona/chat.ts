import { Agent, getDefaultModel, run, type AgentInputItem } from "@openai/agents";

// Slice 1 (docs/architecture/loona-agent.md): plain chat only, no tools yet. Later slices attach
// create_contact and friends to this same Agent instead of a new one.
const instructions = `You are Loona, a lending assistant being built inside Ken OS.

Right now you can only talk -- you can't yet create contacts, loans, or payments. If asked to do one of
those, say plainly that you can't do that yet rather than pretending to.

Plain words, no filler, no em dashes.`;

/** One turn of the Loona chat. `history` is the full prior thread plus the new user turn already appended;
 *  returns the reply text and the updated thread to persist as-is for next time. */
export async function chatWithLoona(
  history: AgentInputItem[],
): Promise<{ reply: string; history: AgentInputItem[]; model: string }> {
  const agent = new Agent({ name: "Loona", instructions });
  const result = await run(agent, history, { maxTurns: 4 });
  if (typeof result.finalOutput !== "string" || !result.finalOutput) throw new Error("Loona returned no reply.");
  return { reply: result.finalOutput, history: result.history, model: getDefaultModel() };
}
