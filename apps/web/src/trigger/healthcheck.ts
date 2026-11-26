import { logger, task } from "@trigger.dev/sdk";

/** Proves trigger.dev is wired up end to end (docs/architecture/loona-agent.md, Slice 2). No real work yet. */
export const healthcheckTask = task({
  id: "healthcheck",
  run: async () => {
    logger.log("Healthcheck OK");
    return { ok: true };
  },
});
