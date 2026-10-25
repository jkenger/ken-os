# Claude Code notes for Loots

`AGENTS.md` at the repo root is the project guide: layout, boundaries, design and copy rules. This file adds only what Claude Code needs on top. Do not copy `AGENTS.md` content here; change it there.

## Stack

- pnpm 10 workspace: `apps/web` (Next.js, React 19, Tailwind 4, shadcn/ui, Drizzle on PostgreSQL) and `packages/{domain,drive,agents}`.
- Next.js is pinned to `latest` and differs from training data: read `apps/web/AGENTS.md` and `node_modules/next/dist/docs/` before writing Next code.
- TypeScript `strict: true` in `apps/web/tsconfig.json`. `noUncheckedIndexedAccess` is off, so array and record reads are typed as always present; guard them yourself.
- Tests use Node's built-in runner through `tsx --test`, not Vitest or Jest. Prettier formats the repo (`.prettierrc`); no linter is configured.

## Quality gates

Run from the repo root before a PR:

1. `pnpm check`: every file is Prettier-formatted, generated lab content and the studio manifest are current, then `tsc --noEmit`.
2. `pnpm test`: unit tests, including the shadcn primitive and default-theme guards, and every lab starter fails while every solution passes.
3. `pnpm build`: production build.

Database checks need `pnpm db:up` (Docker Postgres on `127.0.0.1:5435`) and `pnpm db:migrate` first. Run the one for the area you changed:

- `pnpm --filter @ken-os/web test:db:engineering`
- `pnpm --filter @ken-os/web test:db:terms`
- `pnpm --filter @ken-os/web test:db:profile`
- `pnpm --filter @ken-os/web test:db:auth`
- `pnpm --filter @ken-os/web test:db:memory`

After editing the curriculum YAML, a lesson or a lab, run `pnpm --filter @ken-os/web lab:generate` before `pnpm check`. After changing a component or a token in `globals.css`, run `pnpm --filter @ken-os/web studio:generate`.

`.claude/settings.json` hooks run Prettier on every file Claude writes or edits, then `pnpm check` after every `.ts` or `.tsx` edit.

## CI and deploy

- No GitHub Actions. The gates above are local only, so run them yourself before opening a PR.
- Vercel builds every push. Production runs `db:migrate:deploy` after the build (`apps/web/vercel.json`); previews never migrate.
- PRs are ordinary dependent PRs, not GitHub-native stacks. There is no merge queue.

## Review

`/panel-review` lenses to include by default: `typescript-strict`, `react-testing`, `bff-entry-points` (OAuth, sessions, origin checks in `apps/web` API routes) and `secure-oauth-oidc` when auth changes. The repo has not opted into hexagonal architecture or DDD; skip those lenses.

## Services

The app is a hosted service with env config (`apps/web/.env.example`), local Postgres in `compose.yaml`, and Vercel hosting. For 12-factor service patterns, load the `twelve-factor` skill. The `twelve-factor-audit` agent is available for compliance audits.
