# Choose the stack

Defaults are starting points, not obligations. Honor an existing codebase and explicit user choices first. Check current upstream guidance before installing rapidly changing tools.

| Concern | Default when applicable | Change it when |
| --- | --- | --- |
| Hosted web app | Next.js + TypeScript | Another framework is already established or better fits the product/runtime. |
| Workspace | One pnpm-managed app | Two deployables, independently versioned packages, or real cross-app sharing justify a pnpm workspace. Agent count alone does not. |
| Data | PostgreSQL + Drizzle ORM and generated, reviewed migrations | The product is genuinely stateless, uses another established database, or an existing schema needs a deliberate migration baseline first. |
| UI | Tailwind CSS + shadcn/ui components, customized for the product, with the shadcn MCP server configured | A design system already exists, the UI is too small to benefit, or the framework is incompatible. |
| Client data fetching | Server-side loading in the chosen framework | Use SWR for modest client revalidation or TanStack Query when client caching and mutations are central. Do not install both by default. |
| Agent runtime | OpenAI Agents SDK for bounded, tool-based agent flows | No agent is needed yet, or the chosen deployment/runtime favors a different orchestration model. |
| Hosting | Vercel for a Next.js app plus managed PostgreSQL | The user names a host or workload constraints require another platform. |

Whenever the stack uses shadcn/ui, always set up the [shadcn MCP server](https://ui.shadcn.com/docs/mcp) in the same step as `components.json`, so agents browse, search and install components from the registry instead of guessing their source. For Claude Code, run `pnpm dlx shadcn@latest mcp init --client claude`; it writes a project `.mcp.json` that runs `npx shadcn@latest mcp`. Other clients (Cursor, VS Code, Codex) take the same command in their own config file; follow the linked page for the current form. Commit the project config, and keep any private registry token in `.env.local`, never in the repo.

Choosing shadcn/ui is not the same as using it. In the same setup step:

- Tailor `Button`, `Input` and the other first primitives to the product's design rules, so screens never need class strings that stand in for a component.
- Before building a screen, add every primitive it needs from the registry (tabs, dialog, select, table, sheet and so on) and use those. Never hand-build a control that the registry has.
- Add a test that fails on raw `button`, `input`, `select`, `textarea`, `label` or `table` elements, hand-built widget roles and direct Radix imports outside the primitives folder, with a short allow list for deliberate exceptions.
- Write the rule into the project's agent instructions: use or add the primitive first, and when the design changes a control, change the primitive.

Ken OS skipped these and ended up with a second, hand-built set of buttons, tabs, dialogs and a sidebar beside an installed shadcn.

Choose Vite + React instead of Next.js when the product is genuinely client-only or already has a separate API. Add a worker, queue, vector database, or agent specialist only when the first outcome requires it. Prefer a single process for the first hosted slice. For external content, store a stable reference and fetch current content from its owner unless a cached copy is itself a product requirement.

Do not treat “default” as “already installed.” In an existing repo, inspect dependencies, schema, styling, and migrations before applying the default. Preserve an existing architecture unless the user requests a change or the first outcome exposes a concrete gap.

For the owner's personal projects with no settled visual direction, offer the `ken-os-design` skill as an optional UI preset when it is available. It does not decide the framework or repository shape, and it must not be imposed on work or client projects.
