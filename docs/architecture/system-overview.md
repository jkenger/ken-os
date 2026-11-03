# Architecture

## Shape

TypeScript pnpm monorepo with one deployable Next.js application and small shared packages. The default hosting target is Vercel plus managed PostgreSQL. PostgreSQL persists identity, the owner's details and the resume files they upload.

```text
Browser → Next.js app → PostgreSQL
                 ↘ Google OAuth (sign-in only)
                 ↘ Claude API (Profile Autofill, read only)
                 ↘ OpenAI Agents SDK (Profile rewrite, Terms)
```

## Packages

- `apps/web`: UI, sessions, OAuth callback, API routes, database access.
- `packages/domain`: stable artifact types and supported resume formats.
- `packages/agents`: read-only agent definition and execution.

The next deployable process is a worker only when background jobs are needed. A separate service is not required for the first resume flow.

## Data ownership

`users` identifies the configured owner. `profiles` holds the owner's career details as JSON, `profile_resumes` the uploaded resume files, and `profile_imports` each Autofill read of one (append only). `google_connections` and `artifact_selections` are left from the Drive integration (removed 25 Oct 2026) and nothing uses them. Drizzle owns schema definitions and migrations; its first migration safely baselines the original handwritten tables.

## Security boundary

- OAuth state and PKCE protect the sign-in callback.
- The configured owner email gates the session. Sign-in asks only for `openid email profile`, and no Google token is kept. See `docs/architecture/auth-sign-in.md`.
- Sessions roll: 30 days from last use, renewed at most daily by `src/proxy.ts`, never past 90 days from sign-in. The proxy only renews; pages call `requireSession`.
- API routes validate the session and mutation origin. The exceptions are `GET /api/public/portfolio` and `GET /api/public/portfolio/resume`, which need no session and read only the live published Portfolio snapshot ([portfolio.md](portfolio.md)).
- Autofill sends one uploaded file to Claude and returns fields for review; nothing changes until the owner saves.

## Future seams

- Add `ArtifactSource` adapters for other providers without changing the dashboard contract.
- Add agent specialists behind a shared runtime interface when their permissions or context differ.
- Add durable background work for sync, notifications, and long agent runs.
- Add an approval record before any agent can write to external services.
- Add the proposed [Project Memory module](project-memory.md) inside the existing web app and PostgreSQL boundary before considering a separate worker or cross-tool connector.
- Add the proposed [Portfolio](portfolio.md): a private Portfolio module that publishes one snapshot, a public endpoint that serves it, and a separate `apps/portfolio` on the owner's domain that reads only that endpoint.
- Add the proposed [Design Studio](design-studio.md): a private workspace that lists the repo's and shadcn registries' components from a build-time manifest, renders installed ones on a graph, and saves inspector edits as drafts that export as code.
- Add the proposed [Blog Writing Studio](blog-writing-studio.md) as private authoring plus a public published-snapshot read path in the same app; keep Project Memory an optional, owner-selected source rather than a publishing pipeline.
