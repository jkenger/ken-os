# Hosting playbook design

Status: design decision; no dedicated deployment skill or provider playbook is implemented yet. Ken OS has a Vercel target, but a local build does not establish that it is hosted.

## Skill shape

Start with one focused `deploy-hosted-app` skill. It accepts an existing app, selected provider, and deployment objective; it does not choose product scope or silently change the application's architecture. Its root instructions cover preflight, configuration, deploy, and verification. Provider-specific references are loaded only for the selected host. Split Vercel, Fly, and Render into distinct skills if their triggers or end-to-end workflows later diverge enough to warrant it.

The MVP-building workflow chooses a host early and can hand deployment work to this playbook. It must not claim completion until the public URL and key user flow have been exercised. Provider CLI commands and config syntax should be checked against current official documentation at execution time.

## Provider-neutral contract

- Inputs: repository/app path, framework/runtime, chosen provider, target environment, database choice, external integrations, and intended public domain or provider URL.
- Preflight: confirm account/project access, Git or image source, runtime fit, env/secrets inventory, managed-database reachability, OAuth callback/origin changes, cost-sensitive plan choices, and any background/long-running work.
- Generated configuration: only the selected provider's required files or dashboard instructions. Keep application domain and use-case code host-neutral.
- Release: build, apply reviewed migrations once per release using the provider-supported mechanism, deploy, and confirm rollback/recovery path. Do not run migrations independently on every app instance start. Ken OS on Vercel runs them as the last build step for production deploys only (`apps/web/vercel.json`).
- Verification: public URL responds; sign-in and external callbacks work; persistence survives restart/redeploy; the first user outcome works; failures are visible. Record the exact tested URL and any owner-only steps.
- Reporting states: `designed`, `configured`, `deployed`, and `verified` are distinct. Missing account access or credentials should be reported as a specific remaining prerequisite, not glossed over as hosted.

## Provider branches to design and validate

| Provider | Initial fit | Playbook concerns |
| --- | --- | --- |
| Vercel | Default for a compatible Next.js app | Project linking, framework/build settings, preview versus production env, managed Postgres connection, and a deliberate migration mechanism outside ordinary request handling. |
| Fly.io | Container/Machine workload or runtime control | Docker image, `fly.toml`, secrets, health checks, database networking, and a one-off release command for migrations. |
| Render | Persistent Node web service or static app | Web-service versus static-site choice, build/start commands, env and database wiring, health checks, and plan-dependent pre-deploy migration support. |

These are design branches, not provider-specific instructions ready to execute. Current provider documentation should decide exact syntax and available features: [Vercel environments](https://vercel.com/docs/deployments/environments), [Fly app configuration](https://fly.io/docs/reference/configuration/), [Render Next.js deployment](https://render.com/docs/deploy-nextjs-app), and [Render deploy steps](https://render.com/docs/deploys).
