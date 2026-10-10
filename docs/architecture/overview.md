# Architecture

## Shape

TypeScript pnpm monorepo with one deployable Next.js application and small shared packages. The default hosting target is Vercel plus managed PostgreSQL. PostgreSQL persists identity, encrypted Google refresh tokens, and artifact references. Google Drive remains the content store.

```text
Browser → Next.js app → PostgreSQL
                 ↘ Google OAuth / Drive API / Picker
                 ↘ OpenAI Agents SDK (read-only resume tool)
```

## Packages

- `apps/web`: UI, sessions, OAuth callback, API routes, database access.
- `packages/domain`: stable artifact types and supported resume formats.
- `packages/drive`: Google Drive metadata and content adapter.
- `packages/agents`: read-only agent definition and execution.

The next deployable process is a worker only when background jobs are needed. A separate service is not required for the first resume flow.

## Data ownership

`users` identifies the configured owner. `google_connections` stores an encrypted refresh token. `artifact_selections` maps a purpose such as `primary_resume` to a Drive file ID. Document bytes are fetched from Drive on demand. `skills` stores private, immutable Markdown bundles and their enabled state. Drizzle owns schema definitions and migrations; its first migration safely baselines the original handwritten tables.

## Security boundary

- OAuth state and PKCE protect the sign-in callback.
- The configured owner email gates the session. Sign-in asks only for `openid email profile`; Drive (`drive.file`) is a separate grant from the Resume page (`/api/auth/google/drive`). See `docs/architecture/auth-sign-in.md`.
- Sessions roll: 30 days from last use, renewed at most daily by `src/proxy.ts`, never past 90 days from sign-in. The proxy only renews; pages call `requireSession`.
- The Google refresh token is encrypted at rest with `TOKEN_ENCRYPTION_KEY`.
- API routes validate the session and mutation origin.
- Picker obtains a short-lived access token only after a valid session.
- Agent tools can read selected resume content but cannot modify Drive.

## Future seams

- Add `ArtifactSource` adapters for other providers without changing the dashboard contract.
- Add agent specialists behind a shared runtime interface when their permissions or context differ.
- Add durable background work for sync, notifications, and long agent runs.
- Add an approval record before any agent can write to external services.
- Extend the private skill library from its current resume-agent assignment to explicit multi-agent assignment only when another agent needs it. Uploaded scripts remain unsupported until a sandbox and approval model exist.
- Add the proposed [Project Memory module](project-memory.md) inside the existing web app and PostgreSQL boundary before considering a separate worker or cross-tool connector.
- Add the proposed [Blog Writing Studio](blog-writing-studio.md) as private authoring plus a public published-snapshot read path in the same app; keep Project Memory an optional, owner-selected source rather than a publishing pipeline.
