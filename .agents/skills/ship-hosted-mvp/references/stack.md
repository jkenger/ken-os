# Choose the stack

Defaults are starting points, not obligations. Honor an existing codebase and explicit user choices first. Check current upstream guidance before installing rapidly changing tools.

| Concern | Default when applicable | Change it when |
| --- | --- | --- |
| Hosted web app | Next.js + TypeScript | Another framework is already established or better fits the product/runtime. |
| Workspace | One pnpm-managed app | Two deployables, independently versioned packages, or real cross-app sharing justify a pnpm workspace. Agent count alone does not. |
| Data | PostgreSQL + Drizzle ORM and generated, reviewed migrations | The product is genuinely stateless, uses another established database, or an existing schema needs a deliberate migration baseline first. |
| UI | Tailwind CSS + shadcn/ui components, customized for the product | A design system already exists, the UI is too small to benefit, or the framework is incompatible. |
| Client data fetching | Server-side loading in the chosen framework | Use SWR for modest client revalidation or TanStack Query when client caching and mutations are central. Do not install both by default. |
| Agent runtime | OpenAI Agents SDK for bounded, tool-based agent flows | No agent is needed yet, or the chosen deployment/runtime favors a different orchestration model. |
| Hosting | Vercel for a Next.js app plus managed PostgreSQL | The user names a host or workload constraints require another platform. |

Choose Vite + React instead of Next.js when the product is genuinely client-only or already has a separate API. Add a worker, queue, vector database, or agent specialist only when the first outcome requires it. Prefer a single process for the first hosted slice. For external content, store a stable reference and fetch current content from its owner unless a cached copy is itself a product requirement.

Do not treat “default” as “already installed.” In an existing repo, inspect dependencies, schema, styling, and migrations before applying the default. Preserve an existing architecture unless the user requests a change or the first outcome exposes a concrete gap.
