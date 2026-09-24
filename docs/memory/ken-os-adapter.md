# Ken OS Project Memory adapter

Pilot allowlist: this repository only (`jkenger/ken-os`). Policy version: `1`, defined in `apps/web/src/features/project-memory/contract.ts`. The local command compares the SHA-256 digest of that checked-in policy with the hosted policy before reading or submitting. A mismatch stops capture. It never broadens the policy automatically.

At the start of substantial work, run `pnpm --filter @ken-os/web memory:context` if `KEN_OS_MEMORY_TOKEN` is configured in the untracked `apps/web/.env.local`. Read approved decisions as current and proposed claims as provisional. If the key is absent, keep working locally and report that remote memory was unavailable; do not invent context.

Checkpoint a consequential decision when it is made, then submit a concise receipt at completion or deliberate handoff. Use `pnpm --filter @ken-os/web memory:submit -- decision <draft.json>` or `... receipt <draft.json>`. The draft must use schema version `1`, project ID `ken-os`, a stable idempotency key, and only evidence available to this session. [The pilot spec](../product/project-memory.md) describes provenance and review. The command rejects a non-Ken-OS Git remote, checks the pinned policy, and sends drafts only to the configured Ken OS endpoint. Drafts remain proposed until owner review.

Never upload client/work repository content, raw transcripts, tokens, or secrets. Do not claim access to another model's session. A commit or PR can support a statement about changes but does not prove why the owner chose them. Never edit a commit or PR solely to satisfy capture. The owner creates or revokes a scoped capture key from the Project Memory page; the key is displayed once and must never be committed.

Example decision and receipt payloads live in `docs/memory/examples/`. Copy one to an untracked local draft and replace its illustrative content and idempotency key before submitting. Do not submit the examples themselves.
