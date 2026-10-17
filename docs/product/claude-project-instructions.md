# Claude Project instructions

How the owner's Claude Project, "Loots Engineering", is set up. Everything lives in Loots under Engineering → **Claude setup**, which shows each step with a copy button. Spec: [engineering-claude-first.md](../architecture/engineering-claude-first.md), section 9f.

## The instructions text

The text is in [`apps/web/src/features/engineering-lab/claude-instructions.ts`](../../apps/web/src/features/engineering-lab/claude-instructions.ts) (`CLAUDE_PROJECT_INSTRUCTIONS`), the one source. Claude setup shows it with **Copy instructions** and the date it last changed. To change it, edit that file in a reviewed commit and update `CLAUDE_INSTRUCTIONS_UPDATED`, then paste the new text into the Project. `claude-instructions.test.ts` checks it names the tools it relies on and has no em dashes.

## Set up

In Loots, open Engineering → **Claude setup** and follow its three steps:

1. **Connect Loots.** Copy the connector address, then in claude.ai go to Customize → Connectors → Add custom connector, paste it, and allow it on Loots' consent page. Turn the connector on for the Project.
2. **Project instructions.** In claude.ai, create a Project named "Loots Engineering" if there isn't one, and paste the copied instructions into its instructions.
3. **Project link.** Paste the Project's address (`https://claude.ai/project/…` or `https://claude.ai/code/project/…`). Ask Claude then appears on every topic. `KEN_OS_CLAUDE_PROJECT_URL` in Vercel still works as a fallback until a link is saved.

Then, optionally:

- **Per topic:** once a chat about a topic is going, copy the chat's address and paste it under **Link chat** in that topic's panel. **Continue chat** then opens it.
- **Check once** that Claude in the Project calls `get_current_state` when you paste a starter message. If it answers without a Loots tool call, the connector isn't on for that Project. Once it does, Claude setup step 2 shows **Pasted**: the instructions pass their version to that call.
- **Your resume:** add it to the Project's knowledge, so Claude knows your background when planning. Loots doesn't read it ([why](../architecture/engineering-claude-first.md#3a-no-resume-tool)); re-upload it if it changes.
