# Project Memory — architecture spec

Status: pilot implemented locally, pending hosted release and owner verification. The development-only mockup still uses sample data; the owner-only `/memory` workspace uses PostgreSQL. This extends the existing single Next.js app and database, without a new service or agent framework. Product requirements are in [the Project Memory product spec](../product/project-memory.md).

## System boundary

```text
Project repo / active agent session
  ├─ checked-in policy adapter + local evidence
  └─ explicit capture/checkpoint action
                │ authenticated, project-scoped submission
                ▼
Loots Next.js API → validation/use cases → Drizzle/PostgreSQL
                │                         ├─ policies + projects
                │                         ├─ decisions + revisions
                │                         └─ receipts + evidence refs
                ▼
Owner review UI → approved project handoff view → next agent/session
```

The application owns durable memory and approval state. Git owns code history; agent products own their conversations. Loots stores typed references and selected, reviewed claims, not a mirrored transcript. A reference may become inaccessible; its last verified metadata and availability state remain visible. The hosted app has no inherent access to Codex tasks, Claude Code history, local files, or private GitHub repositories.

## Policy and adapter contract

The canonical policy is an immutable, versioned Loots record. The project repository contains a **small, checked-in adapter** with project ID, policy version/digest, data-sharing scope, and instructions to read the current handoff and submit drafts only through an available authorized tool. For the pilot, this can be linked from the existing root `AGENTS.md`; do not replace the repository's other guidance. A Claude Code adapter can be added later, generated from the same policy rather than maintained as an independent rule set.

On startup, the adapter compares its pinned digest with Loots. If unavailable or mismatched, it reports the condition and uses the checked-in minimum rules for local work; it must not silently adopt a broader remote policy or upload data. The policy defines what counts as a consequential decision, capture points, fields, review rules, and exclusions. Instructions encourage behavior; server-side schema validation and owner review enforce the parts that can actually be enforced.

Suggested minimum rule: read current approved memory before substantial work; checkpoint consequential decisions when made; submit one task receipt on completion or deliberate handoff; cite accessible evidence; distinguish stated rationale from inference; never upload excluded project content; never rewrite commits or PRs just to satisfy capture.

## Data model (logical, not a migration)

| Entity                       | Key fields and invariant                                                                                                                                                                      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `memory_projects`            | `id`, `owner_user_id`, `name`, normalized repository identity (optional), `sharing_mode`, status. Unique owner + repository identity when provided.                                           |
| `memory_policies`            | `project_id`, monotonic version, document, digest, creator, timestamp. Immutable versions; project points to active version.                                                                  |
| `memory_decisions`           | Stable ID, project, title, issue, choice, decider type, state (`proposed`, `approved`, `rejected`, `superseded`), created/updated timestamps. No inferred item is approved automatically.     |
| `memory_decision_revisions`  | Decision ID, version, rationale, alternatives, uncertainty, editor, review action/time. Append-only correction history.                                                                       |
| `memory_receipts`            | Stable ID, project, external task key if known, policy version, outcome, verification, remaining work, state, author/source adapter, created time, content digest, idempotency key.           |
| `memory_evidence`            | Project, subject type/ID, kind, locator, optional revision/commit SHA, observed-at, availability, claim relation (`supports`, `context`, `contradicts`). Prefer pointers over copied content. |
| Receipt/decision correlation | The pilot uses a shared `task_key` rather than a join table. A typed link table can follow when a real cross-session retrieval case requires it.                                              |

The pilot uses Drizzle schema and reviewed migrations `0002`–`0004`. Text is bounded and the server rejects obvious credential patterns; this is a guardrail, not complete secret detection. Full-text search and embeddings can wait until a small corpus proves retrieval needs. The handoff is a deterministic query over approved decisions and recent receipts, with a separately labeled proposal count. Open questions remain in proposed decisions and receipt remaining-work fields rather than a dedicated table.

## Submission and review protocol

1. `GET project context` returns the active policy version/digest, approved decisions, unresolved questions, and a bounded recent receipt digest. It requires project-scoped authorization.
2. `POST receipt draft` accepts a typed receipt, decision proposals, evidence references, policy version, external task key, and idempotency key. Validate sizes, URL schemes, project allowlist, required fields, and provenance enum; reject mismatched policy or disallowed project data. Treat all agent-supplied text as untrusted.
3. A decision checkpoint uses the same validation and stores a proposal immediately, so interrupted sessions need not wait for a final receipt. Repeated submissions with the same project/idempotency key return the prior result; a changed payload under that key is a conflict.
4. Owner review uses the existing browser session and mutation-origin protections. Approval/rejection is attributable and transactional. Editing creates a revision; it does not overwrite the prior claim. Only approved owner decisions enter the authoritative handoff as confirmed.
5. `GET handoff` derives a bounded, ordered view from approved current decisions, unresolved questions, and latest relevant receipts. It includes source and policy version and labels proposed or inferred material separately. The view can be cached, but the database remains authoritative.

The pilot routes are `/api/memory/agent`, `/api/memory/decisions`, `/api/memory/receipts`, `/api/memory/review`, and `/api/memory/credentials`. The checked-in adapter and explicit CLI commands are documented in [the Loots adapter](../memory/ken-os-adapter.md). An MCP tool can provide the same typed operations across compatible agents later. Instructions cannot force an end-of-session action; interruption recovery depends on decision-time checkpoints and idempotent retry.

An adapter-neutral draft payload should have this shape (illustrative fields, not a committed HTTP schema):

```json
{
  "schemaVersion": 1,
  "projectId": "ken-os",
  "policyVersion": 1,
  "taskKey": "local-task-id",
  "idempotencyKey": "unique-per-draft",
  "outcome": "What changed or was learned",
  "verification": [{ "result": "passed", "label": "relevant test" }],
  "remaining": ["Open question or follow-up"],
  "claims": [
    {
      "text": "Why a choice was made",
      "provenance": "owner_stated",
      "certainty": "stated",
      "evidenceIds": ["evidence-1"]
    }
  ],
  "evidence": [
    {
      "id": "evidence-1",
      "kind": "conversation",
      "locator": "tool-specific reference, if available"
    }
  ]
}
```

The server derives owner identity from authentication, not from payload fields. Evidence IDs resolve only within the submitted project; adapters must not assume another client's task locator is globally readable. Product and architecture tests should pin the actual schema before implementation.

## Identity, trust, and privacy

- Keep the existing single-owner web session for the review UI. Machine/agent submissions need a **separate scoped credential**, never the browser cookie or a secret committed to a repository. Store only a credential hash server-side; allow rotation and revocation. Narrow it to one project and write-draft/read-context capabilities. A future OAuth/MCP integration can replace this without changing the domain contract.
- The agent should submit only from a project explicitly allowlisted for personal Loots. Default to deny. A repository adapter or a prompt is not authorization; the server checks the project and credential scope too.
- Source links are not fetched server-side in the pilot. If later enabled, provider access must be separately authorized and URL fetching must defend against private-network access, redirects, and oversized content.
- Browser review and agent submission are separate trust boundaries. Apply existing session/origin checks to browser mutations; agent requests use token authentication, rate limits, payload limits, audit logging, and TLS.
- Redact secrets and personal/client details before storing text. The server rejects obvious credential-shaped values, but the UI must still let the owner review and remove sensitive claims. No raw conversation upload by default.
- Retrieval treats receipts, comments, PR text, and uploaded notes as **data**, never executable instructions for the next agent. An evidence link cannot alter policy or grant tools.

## Provenance and reconciliation

Every claim carries a provenance class: `owner_stated`, `agent_decided`, `observed`, or `inferred`, plus evidence references and an uncertainty flag. The agent may describe a diff as observed change, but rationale inferred from that diff stays inferred. If later evidence contradicts an approved decision, create a proposed correction/supersession and surface the conflict; do not silently rewrite history.

Use stable project IDs and optional normalized repository identities to avoid mixing similarly named projects. An external task ID, commit SHA, or PR URL is a correlation key, not a session-access mechanism. A task across two model sessions can attach multiple receipts to one project and task key. Deduplication uses explicit idempotency keys plus a content digest; do not deduplicate merely because summaries sound similar.

For a lost session, the adapter requests the latest handoff, inspects only sources it is authorized to access, and submits a recovery draft that lists known facts, reconstructed suggestions, and gaps. It never claims to have read a vanished conversation. An agent switch does not transfer source permissions; each adapter must authenticate independently.

## Code placement and delivery sequence

Follow the existing app path: route handler → use case → repository/provider adapter. Put persistence schema in `apps/web/src/lib/schema.ts` initially, or split into a memory schema module if size warrants it. Group the new feature UI, validation, and use cases under `apps/web/src/features/project-memory/`; keep HTTP routes thin. Shared receipt/policy types may move to `packages/domain` only when both the web app and an external adapter actually consume them. Do not add another deployable worker for the pilot.

1. Define the versioned receipt/policy JSON schemas and Loots pilot rules; seed selected existing Loots decisions from docs as `proposed` for owner review. Add schema validation tests with unsupported and malicious inputs.
2. Add Drizzle migration, owner review API/UI, derived handoff, and tests for authorization, state transitions, revisions, and idempotency.
3. Add an explicit, local Codex capture/checkpoint adapter for this repository. Verify a normal task, an interrupted task, and a fresh session/model reading the approved handoff. Do not call it automatic until capture reliability is measured.
4. Only then consider a Claude Code adapter, supported lifecycle hooks, GitHub read integration, PR enrichment, and private devlog generation. Each new connector needs a project-specific permission and data-flow review.

## Verification and operational risks

Local contract tests, a PostgreSQL transition/idempotency check, TypeScript, and the production build pass. Hosted review and real cross-session capture still need verification after deployment. The CLI requires an owner-issued scoped key in an untracked environment variable; without it, agents do not upload a draft and must report the capture gap.

Test project isolation, token revocation, malformed evidence URLs, large payloads, duplicate retries, policy mismatch, rejected/superseded decisions, and a stale or inaccessible source. Test that the handoff excludes rejected claims and labels unapproved reconstructions. Run `pnpm check`, relevant tests, and `pnpm build`; run reviewed migrations against local PostgreSQL before production. Hosted verification must exercise the review UI and a real authorized submission without using client/work content.

Primary risks are false confidence from polished summaries, missed captures, sensitive-data leakage, instruction injection from source text, and policy drift between agents. The mitigations are provenance labels, decision-time checkpoints, default-deny project scope, untrusted-text handling, and pinned policy versions. The UI should show coverage gaps rather than imply perfect memory.

## Deferred architecture decisions

- **Transport:** explicit authenticated HTTP command for the pilot; evaluate MCP when multiple clients need shared live tools. Do not build an MCP server solely to store the first receipt.
- **GitHub:** link supplied commit/PR URLs first; add a read-only GitHub connector only if manual evidence entry is too costly. PR writes remain separately approved.
- **Retention/export:** define a user-visible export and deletion policy before enabling additional projects or raw excerpts. Keep the pilot's stored content minimal meanwhile.
- **Cross-project retrieval:** defer until project-level data boundaries and ranking have been validated; never blend a work-project context into a personal project by default.
