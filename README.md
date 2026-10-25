# Loots

A private, hosted workspace for one developer. Each workflow is a module inside one Next.js app, and only the configured owner can sign in.

Loots was called Ken OS until October 2026. The repository, the `@ken-os/*` packages and other identifiers keep the old name.

## Modules

| Module         | Route          | What it does                                                                                                                                                                   |
| -------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Profile        | `/profile`     | Career details stored as fields, typed in or autofilled with Claude from an uploaded PDF or Word resume, reviewed field by field. Resumes are rendered from those fields.      |
| Engineering    | `/engineering` | A learning roadmap for full-stack and AI engineering: chapters, topics, statuses, review sheets, notes and one code lab per topic. Claude teaches through the Loots connector. |
| Terms          | `/terms`       | Select text anywhere in the app and press Explain (or E) for a short definition from trusted sources. Saved terms are underlined wherever they appear.                         |
| Project Memory | `/memory`      | A pilot for recording decisions and work receipts on Loots itself, with owner review and a generated handoff.                                                                  |

`/` redirects to `/profile`.

### Claude connector

Loots is also an MCP server (`/api/mcp`, with OAuth at `/oauth/authorize`). A Claude Project connected to it can read the Engineering roadmap, report progress, and save exercises, notes and reviews. Claude can mark a topic Learned only with the owner's own explanation as evidence, and it can never change a status the owner set or edit the owner's notes. See [engineering-claude-first.md](docs/architecture/engineering-claude-first.md).

## Tech stack

- TypeScript in a pnpm 10 workspace
- Next.js (App Router) and React 19
- Tailwind CSS 4 and shadcn/ui
- PostgreSQL with Drizzle ORM and Drizzle Kit migrations
- Google OAuth for sign-in
- Claude API for Profile Autofill; OpenAI Agents SDK for the Profile rewrite and term lookup
- Model Context Protocol SDK for the Claude connector
- Vercel hosting

## Repository layout

```text
apps/web/            Next.js app: UI, API routes, auth, sessions, database
  src/app/           Routes (profile, engineering, terms, memory, api, oauth)
  src/features/      Module logic (profile, engineering-lab, terms, connector, project-memory)
  src/components/    UI; shadcn primitives live in components/ui
  drizzle/           SQL migrations
  scripts/           Migration, lab generation and database check scripts
packages/domain/     Shared types and format rules
packages/agents/     Profile and term lookup agents
content/             Engineering topic map, roles and curriculum (YAML)
labs/                One code lab per Engineering topic (starter, solution, tests)
docs/                Product specs and architecture notes
```

## Getting started

### Prerequisites

- Node.js and pnpm 10
- Docker, for the local PostgreSQL container
- A Google Cloud project with an OAuth client, for sign-in
- An Anthropic API key, for Profile Autofill, and an OpenAI API key, for the Profile rewrite and term lookup

### Setup

1. Install dependencies and start the database. Postgres runs on `127.0.0.1:5435`.

   ```sh
   pnpm install
   pnpm db:up
   ```

2. Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the values (see [Configuration](#configuration)).

3. In Google Cloud, add `http://localhost:3000/api/auth/google/callback` as an OAuth redirect URI and `http://localhost:3000` as a JavaScript origin. Restrict the Picker API key to that origin and `https://docs.google.com/*`. While the OAuth consent screen is in testing mode, add your email as a test user.

4. Apply migrations and start the app at `http://localhost:3000`.

   ```sh
   pnpm db:migrate
   pnpm dev
   ```

`pnpm db:down` stops the container; its named volume keeps the data.

### Configuration

All variables are listed in [`apps/web/.env.example`](apps/web/.env.example).

| Variable                                   | Purpose                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `APP_URL`                                  | Public origin of the app                                                            |
| `OWNER_EMAIL`                              | The only Google account allowed to sign in                                          |
| `DATABASE_URL`                             | PostgreSQL connection string                                                        |
| `DATABASE_URL_UNPOOLED`                    | Optional direct connection for migrations when `DATABASE_URL` is pooled             |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth client                                                                 |
| `SESSION_SECRET`                           | Session signing (32 or more random chars)                                           |
| `ANTHROPIC_API_KEY`                        | Profile Autofill                                                                    |
| `OPENAI_API_KEY`                           | Profile rewrite, term lookup                                                        |
| `MCP_ALLOWED_REDIRECT_HOSTS`               | Hosts allowed for Claude connector OAuth redirects (default `claude.ai,claude.com`) |
| `KEN_OS_CLAUDE_PROJECT_URL`                | Optional fallback Claude Project link for Ask Claude                                |

## Scripts

Run from the repository root.

| Command                                  | What it does                                                         |
| ---------------------------------------- | -------------------------------------------------------------------- |
| `pnpm dev`                               | Start the app in development                                         |
| `pnpm build`                             | Production build                                                     |
| `pnpm check`                             | Prettier check, generated lab content check, then `tsc --noEmit`     |
| `pnpm test`                              | Unit tests, UI guards, and lab starter and solution checks           |
| `pnpm format`                            | Format every file with Prettier                                      |
| `pnpm db:up` / `pnpm db:down`            | Start or stop local PostgreSQL                                       |
| `pnpm db:generate`                       | Generate a migration from schema changes (review the SQL before use) |
| `pnpm db:migrate`                        | Apply migrations to the local database                               |
| `pnpm --filter @ken-os/web lab:generate` | Regenerate lab content after editing curriculum YAML or a lab        |

## Testing

Before opening a PR, run:

```sh
pnpm check
pnpm test
pnpm build
```

Tests use Node's built-in test runner through `tsx --test` and do not call Google. Database checks run against local Postgres only and refuse non-local URLs. With `pnpm db:up` and `pnpm db:migrate` done, run the one for the area you changed:

```sh
pnpm --filter @ken-os/web test:db:profile
pnpm --filter @ken-os/web test:db:engineering
pnpm --filter @ken-os/web test:db:terms
pnpm --filter @ken-os/web test:db:connector
pnpm --filter @ken-os/web test:db:auth
pnpm --filter @ken-os/web test:db:memory
```

There is no CI; these checks are run locally.

## Deployment

Loots deploys to Vercel with a managed PostgreSQL database.

1. Set the Vercel project's Root Directory to `apps/web` and allow workspace packages outside it in the build settings.
2. Set the variables from `.env.example`, with `APP_URL` as the deployment's HTTPS origin.
3. Add `APP_URL/api/auth/google/callback` to Google's OAuth redirect URIs and `APP_URL` to its JavaScript origins.

Production deploys apply pending migrations after the build (`db:migrate:deploy` in `apps/web/vercel.json`); preview deploys never change the schema, and a failed migration fails the deploy. Because the schema changes just before new code goes live, each migration must work with the code already deployed: add tables and columns first, and remove old ones in a later release. Never run `db:migrate` against the hosted database by hand.

## Security

- Sign-in is restricted to `OWNER_EMAIL`, with OAuth state and PKCE on the callback.
- Sessions last 30 days from last use and never more than 90 days from sign-in.
- Sign-in asks Google only for `openid email profile`; no Google token is stored. API routes check the session and the request origin on mutations.

## Documentation

- [AGENTS.md](AGENTS.md): repository guide for contributors and coding agents (layout, boundaries, design and copy rules)
- [Product brief](docs/product/brief.md) and [architecture overview](docs/architecture/overview.md)
- [Profile and resume builder](docs/product/profile-resume.md)
- [Engineering, Claude first](docs/architecture/engineering-claude-first.md) and [roadmap UI](docs/architecture/roadmap-ui.md)
- [Project Memory product](docs/product/project-memory.md) and [architecture](docs/architecture/project-memory.md)
- [Sign-in and sessions](docs/architecture/auth-sign-in.md)
- [App language](docs/product/app-language.md) for UI copy
- Proposals, not yet built: [one-app starter standard](docs/architecture/starter-standard.md), [hosting playbook](docs/architecture/hosting.md), [Blog Writing Studio](docs/product/blog-writing-studio.md)

## License

Private project. No license is granted for reuse.
