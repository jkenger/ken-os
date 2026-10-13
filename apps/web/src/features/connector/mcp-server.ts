import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { agentTools, callAgentTool, toolInputs } from "@/features/engineering-lab/agent-tools";
import { LabInputError } from "@/features/engineering-lab/errors";

// The MCP server behind /api/mcp: the Engineering tools from agent-tools.ts, for one signed-in owner. Built fresh for
// each request; nothing is kept between requests. Spec: docs/architecture/engineering-claude-connector.md, section 3.

const INSTRUCTIONS =
  "Ken OS is the owner's Engineering roadmap. Call get_current_state first and get_topic before teaching a topic. " +
  "Report what happens with report_progress, and save tips for the owner with save_note. Mark a topic learned only " +
  "after the owner explains it in their own words without hints, and pass that explanation word for word as evidence. " +
  "Saved exercises are checked in the owner's browser before they show. Never reveal a solution before the owner has tried. " +
  "To plan a roadmap, ask the owner's goal and background, propose chapters from get_roadmap, add new topics only when " +
  "nothing fits, and call save_roadmap only after they agree.";

/** A tool result: compact JSON text for the model, plus the same object as structured content. */
function result(value: unknown) {
  const structured = (value ?? {}) as Record<string, unknown>;
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }], structuredContent: structured };
}

export function buildMcpServer(userId: string) {
  const server = new McpServer(
    { name: "ken-os-engineering", title: "Ken OS Engineering", version: "1.0.0" },
    { instructions: INSTRUCTIONS },
  );
  for (const tool of agentTools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: toolInputs[tool.name],
        annotations: {
          title: tool.title,
          readOnlyHint: tool.kind === "read",
          destructiveHint: false,
          idempotentHint: tool.kind === "read",
          openWorldHint: false,
        },
      },
      async (input: unknown) => {
        try {
          return result(await callAgentTool(userId, tool.name, input));
        } catch (error) {
          if (error instanceof LabInputError)
            return { content: [{ type: "text" as const, text: error.message }], isError: true };
          console.error("mcp tool failed", tool.name, error instanceof Error ? error.message : error);
          return {
            content: [{ type: "text" as const, text: "Ken OS couldn't run this tool. Try again" }],
            isError: true,
          };
        }
      },
    );
  }
  return server;
}
