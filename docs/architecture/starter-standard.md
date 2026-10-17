# Hosted MVP starter standard (design)

Status: design decision; a scaffold CLI and templates have not been implemented. This is a reusable project-starting standard, not a migration instruction for the existing Loots monorepo.

## Sequence and outputs

| Gate      | Decision                                                                                       | Artifact                                                     |
| --------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Scope     | One complete user outcome, its source of truth, exclusions, and observable acceptance criteria | Short product brief                                          |
| Select    | Framework, repository shape, data, UI, agent runtime, and host                                 | Small decision record with reasons and rejected alternatives |
| Architect | Data flow, ownership, trust boundaries, and the first feature path                             | Codebase map and integration preflight                       |
| Scaffold  | Generate only the selected baseline and verify it starts                                       | Runnable app, example environment, tests, and local setup    |
| Ship      | Implement the first vertical slice and test it in production                                   | Live URL, smoke-test record, and remaining limitations       |

The first three gates can be brief and iterative. Do not generate code until the choices that affect its structure are clear. Do not turn a design-only request into scaffolding or a deployment.

## Defaults and selection rules

- Start with **one application in one repository**, managed with pnpm and TypeScript. Move to a pnpm workspace when there are multiple deployables, a truly reusable package, or an independently versioned component. Multiple agents inside one app do not alone require a monorepo.
- For a hosted full-stack web product, default to Next.js. Choose Vite + React when a client-only app or an existing separate API makes that simpler.
- For UI, default to Tailwind CSS utilities for components and layouts plus tailored shadcn/ui primitives. Reserve CSS files for theme tokens, font imports, and minimal global rules; do not build routine screens with page-level CSS selectors. Do not scaffold a generic dashboard as a substitute for designing the user flow.
- Every control on a screen comes from a shadcn primitive in `components/ui`. Add a missing one from the registry before building the screen, tailor primitives to the design contract (not screen by screen), and ship a test that fails on raw controls outside `components/ui`. Loots skipped all three and drifted to hand-built controls; see [the shadcn audit](shadcn-audit.md).
- For the Loots visual baseline, use Bricolage Grotesque for headings and Public Sans for UI/body copy, paired with the Studio tokens (stone ground, raised white panels, one cobalt signal). Treat these as design defaults, not hard-coded constraints on unrelated projects; confirm typography alongside the app shell before extracting a reusable design skill.
- The current Loots component decisions are recorded in the Ken OS design system in Claude, the owner's private source of truth for its look. They are a working product baseline, not a scaffold requirement for every new project.
- Use PostgreSQL and Drizzle with reviewed migrations when persistent relational data is part of the first outcome. A stateless app should not acquire a database merely to fit the preset.
- Prefer framework server-side loading first. Add SWR for light client revalidation or TanStack Query when client-side cache, mutations, and invalidation are central; select one deliberately.
- Add an agent runtime only when the first outcome needs an agent. Start with one bounded agent and explicit tools rather than speculative specialists.
- Default host for a compatible Next.js app is Vercel, but choose the host against runtime, background work, database connectivity, region, cost, and operational needs. See [hosting design](hosting.md).

Explicit user choices and an existing repository take priority over these defaults. The selected combination should be represented in a small manifest or decision record so a later scaffold can reproduce it; the manifest is not yet an implemented CLI contract.

## Codebase contract for a single app

The Next.js example layout is a convention, not a mandate to create every folder on day one. A Vite app would substitute its own entry and routing structure for `app/`:

```text
src/
  app/                     routes, layouts, route handlers/server actions
  features/<feature>/      feature UI, use cases, validation, and tests
  components/ui/           shared visual primitives
  lib/auth/                identity and session boundary, if needed
  lib/db/                  schema, connection, migrations, and repositories, if needed
  integrations/<provider>/ external API adapters, if needed
```

Keep a feature's normal path traceable: **UI → thin request boundary → use case → repository/provider adapter**. A use case owns business decisions and coordinates IO; the route owns HTTP concerns, authentication, and input/output translation. Schema and migrations live with the database boundary. Provider SDK types should not leak into domain decisions or UI contracts. Define interfaces where they allow a real alternate adapter or meaningful isolated test, not around every table or function.

Each datum needs a named source of truth. Store stable external IDs instead of mutable labels, and decide explicitly whether content is fetched live, cached, or copied. Authentication, permissions, secrets, and agent tool capabilities are trust boundaries, not feature-folder conventions. External writes require an approval policy appropriate to the action.

Tests follow risk: unit-test domain/use-case rules, integration-test persistence and provider boundaries, and exercise the actual first user flow. Keep `check`, `test`, `build`, and migration commands discoverable. The scaffold should include a health path only if the selected host needs one; a green build does not prove OAuth, database, or provider access works.

## Future scaffold interface

The proposed CLI should collect the project name, framework, app/workspace shape, data choice, UI choice, client-query choice, agent runtime, and host. It should show a summary before writing files, generate only compatible selections, and fail clearly on conflicting combinations. Its output should include a current dependency set, minimal example vertical path, environment-variable inventory without secrets, migration/local-database setup where selected, and provider-specific deployment configuration only for the selected host.

Validation for the eventual generator: create representative default and alternate projects in temporary directories; install, type-check, test, build, run migrations when selected, and verify the generated deployment instructions against the host's current documentation. No scaffold CLI or template is claimed to exist yet.
