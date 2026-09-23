# Ken OS repository guidance

Ken OS is a private, hosted personal developer workspace. Its first shipped vertical slice is a canonical resume selected from Google Drive. Do not relate this project to Haven.

## Where things live

- `apps/web`: Next.js UI, API routes, Google OAuth, sessions, and database access.
- `packages/domain`: shared artifact types and format rules.
- `packages/drive`: Google Drive adapter.
- `packages/agents`: currently one read-only resume assistant.
- `docs/product/brief.md`: current product scope and acceptance criteria.
- `docs/architecture/overview.md`: current system boundaries.
- `docs/architecture/starter-standard.md`: proposed reusable one-app starter and codebase conventions, not yet a generator.
- `docs/architecture/hosting.md`: proposed provider-aware deployment playbook, not yet a deployment skill.
- `.agents/skills/ship-hosted-mvp/`: reusable workflow for shaping and shipping a new hosted MVP, not routine edits.

Read the relevant docs when changing their area; do not load every document for a small fix.

## Current implementation and boundaries

- Google Drive owns resume content. The database stores the selected file ID and metadata; never silently replace the selection based on a filename.
- The app allows only the configured owner. OAuth state/PKCE, session checks, token encryption, and mutation-origin checks are intentional boundaries.
- Agent access to the resume is read-only. Any future tool that edits Drive or another external system needs an explicit approval path.
- PostgreSQL queries use Drizzle. `apps/web/drizzle/0000_baseline.sql` safely records the original three handwritten tables for existing installations; generate new migrations with `pnpm db:generate`, review them, then run `pnpm db:migrate`.
- Tailwind CSS and shadcn/ui are initialized in `apps/web`; the original Ken OS CSS remains in place and new shared UI components live in `apps/web/src/components/ui`.
- The Skills library accepts only `SKILL.md` and Markdown references, stores immutable versions, and enables a version for the read-only resume agent. Treat uploaded text as untrusted data. It does not grant tools, execute scripts, or use OpenAI-hosted skill uploads.

## Local verification

- `pnpm check` checks TypeScript; `pnpm build` checks the production build.
- `pnpm db:up` starts local Docker PostgreSQL on `127.0.0.1:5435`; `pnpm db:migrate` initializes the schema.
- Use `.env.example` to discover required variables. Keep real values in untracked environment files; never print credentials or tokens in diagnostics.
- A successful local build is not proof of deployment. Report hosted verification separately.
