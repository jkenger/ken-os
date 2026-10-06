---
name: ship-hosted-mvp
description: Scope and ship a hosted software MVP from an idea through one working vertical slice. Use for new projects needing product boundaries, architecture choices, implementation, and live verification; not for routine feature edits.
---

# Ship a hosted MVP

Start with the user's repeated problem and the smallest complete outcome that removes it. Treat their product and technology choices as authoritative. Distinguish designed, implemented, deployed, and verified work.

1. Use [scope](references/scope.md) to define the first user outcome, exclusions, and observable acceptance criteria before scaffolding.
2. Use [stack](references/stack.md) when choosing the framework, workspace shape, data, UI, agent runtime, and host. Default to one deployable app; add packages or processes only for a demonstrated boundary. Record consequential choices and their reasons. When the UI uses shadcn/ui, always configure the shadcn MCP server, tailor the primitives, and add the guard test described there.
3. Use [architecture](references/architecture.md) before creating code to settle data ownership, request/data flow, trust boundaries, and the first vertical-slice path. Scaffold only the chosen options, not every possible extension.
4. Implement and verify that slice, including only the auth, persistence, error handling, and integrations it needs. If hosting is in scope, check deployment prerequisites early and verify the user flow at a reachable URL. A local build is not a hosted result.

Do not run a scaffold or deployment merely because this skill was invoked for design discussion. Capture reusable lessons after real friction, but do not turn one project's provider or incident into a universal rule. If a choice materially changes scope, cost, permissions, or data ownership, ask before committing to it.
