# Ken OS

A private, hosted developer workspace. The first module keeps one canonical resume connected to Google Drive.

## Current vertical slice

- Google sign in, restricted to `OWNER_EMAIL`
- Google Picker selection using the per-file `drive.file` scope
- Persistent canonical resume selection by Drive file ID
- Live metadata refresh, preview, and download
- Read-only resume assistant for Google Docs files
- Private Skills library: upload Markdown skill bundles, review versions, export source or ZIP, and enable them for the resume assistant

See [the product brief](docs/product/brief.md) and [architecture](docs/architecture/overview.md).

The [Skills library](docs/product/skills.md) describes the current first slice and its future boundaries. The reusable [hosted MVP skill](.agents/skills/ship-hosted-mvp/SKILL.md) and [repository guidance](AGENTS.md) capture how this project is built.

The proposed [one-app starter standard](docs/architecture/starter-standard.md) and [hosting playbook](docs/architecture/hosting.md) are design documents, not yet a scaffold CLI or deployment skill.

The proposed Project Memory module has separate [product](docs/product/project-memory.md) and [architecture](docs/architecture/project-memory.md) specs. Receipt capture and agent connectors are not implemented yet.

## Local setup

1. Run `pnpm install`, then `pnpm db:up`. This starts a development-only Docker PostgreSQL service on `127.0.0.1:5435`; the other nearby ports are already in use on this machine.
2. If you do not already have an app environment file, copy `apps/web/.env.example` to `apps/web/.env.local`. The local `DATABASE_URL` is `postgresql://user:password@localhost:5435/ken_os`. Fill in the remaining values.
3. In Google Cloud, enable the Google Drive and Google Picker APIs. Register `http://localhost:3000/api/auth/google/callback` as an OAuth redirect URI and `http://localhost:3000` as an allowed JavaScript origin. Configure the Picker API key for that origin and `https://docs.google.com/*`.
4. Run `pnpm db:migrate`, then `pnpm dev`. Use `pnpm db:down` to stop the Ken OS container; its named volume keeps the data. For a hosted database with separate pooled and direct URLs, put the direct URL in `DATABASE_URL_UNPOOLED`. The migration uses it when present. The initial Drizzle migration is safe for databases created by the earlier handwritten migration. For later schema edits, run `pnpm db:generate`, review the SQL, then migrate.

The Google OAuth consent screen may need your email added as a test user while the application is in testing mode.

After signing in, open `/skills` to upload `SKILL.md` or a ZIP containing one top-level skill folder with `SKILL.md` and optional Markdown files under `references/`. Review the saved files, then enable a version for the resume assistant. Uploads do not execute scripts or grant the assistant new permissions.

## Verification

Run `pnpm check`, `pnpm test`, and `pnpm build` before release. The tests cover skill ZIP round-tripping and the selected Drive file's latest metadata/content behavior without calling Google. `pnpm test:db` checks skill versioning and owner isolation; `pnpm test:db:resume` checks that a metadata refresh keeps the selected Drive ID. Both database checks refuse non-local URLs. After a production deploy, check the resume flow in the browser and inspect Vercel runtime logs for errors. Do not run tests against the owner's live resume.

## Hosting

The default target is Vercel for `apps/web` with a managed PostgreSQL database. Set the Vercel project's Root Directory to `apps/web` and allow workspace packages outside that directory in its build settings. Configure the variables from `.env.example` for the deployment, with `APP_URL` set to its public HTTPS origin. Add `APP_URL/api/auth/google/callback` to Google's OAuth redirect URIs and `APP_URL` to its JavaScript origins. Run `pnpm db:migrate` against the production database before signing in.

The app stores only the selected Drive file ID and metadata; Google Drive remains the source of document content. When the Google OAuth consent screen is an external app in **Testing** status, Google refresh tokens for the Drive scope expire after seven days. For persistent hosted use, move the Google app to **In production** after its setup is complete, or use the reconnect action when testing tokens expire.
