# Blog Writing Studio — architecture spec

Status: proposed design; no schema or routes have been implemented. Product behavior is defined in [the Blog Writing Studio spec](../product/blog-writing-studio.md).

## Deployment and boundaries

Keep one Next.js application and the existing Vercel/PostgreSQL deployment. The private studio and public blog are separate route groups and authorization paths, not separate services. PostgreSQL owns drafts, raw selections, and immutable publication snapshots. Project Memory owns its private decisions and receipts; the blog does not copy or index them by default.

```text
Owner browser ── private studio/editor ── owner APIs ── blog use cases ── Drizzle/PostgreSQL
                         │                    │
                         └─ bounded assistant ─┘ (server-side model call; no write tool)

Public browser ── /blog, /blog/[slug] ── published-snapshot read model only
```

Private editor pages use the existing Google owner session. Every mutation also uses the existing origin check. Public routes require no session but can only query the current published snapshot. Keep assistant calls server-side with the existing model credential; never expose it to the browser. No background worker, queue, new agent framework, or cross-service event bus is needed for the first slice.

## Code placement and request path

Use `apps/web/src/features/blog/` for the post contract, outlines, validation, use cases, assistant prompts, and tests. Keep route handlers under `apps/web/src/app/api/blog/` thin: authenticate where needed, validate request/size, invoke a use case, return a bounded result. Put the owner workspace under a private route such as `/writing`; public routes are `/blog` and `/blog/[slug]` with a layout independent of the authenticated app shell. Reuse shadcn primitives and the Ken OS design baseline for the studio, without requiring the eventual public site to use the same shell.

The normal write path is **editor → autosave request → validated use case → repository → PostgreSQL**. The public read path queries a published projection, not the working document. Do not move types into `packages/domain` until another package actually consumes them.

## Editor and document format

Use a client-side rich-text editor with a deliberately small schema. Tiptap/ProseMirror is the proposed editor adapter: its structured JSON supports headings, paragraphs, marks, selections, and transactions, which are useful for anchored suggestions. Persist versioned editor JSON in `jsonb`; validate allowed nodes, marks, link protocols, document size, and schema version on the server. Render public HTML from that allowlisted document on the server; do not trust stored or model-produced HTML. Text/Markdown export can be added without making Markdown the editing source of truth.

This choice is based on [Tiptap's structured document model](https://tiptap.dev/docs/editor/core-concepts/introduction), [JSON persistence guidance](https://tiptap.dev/docs/editor/core-concepts/persistence), and [React/SSR setup](https://tiptap.dev/docs/editor/getting-started/install/react). Do **not** assume the `@tiptap/suggestion` autocomplete utility is the review mechanism for grammar edits; implement bounded editor decorations and explicit accept/reject actions, and verify available licensing before adopting a tracked-changes extension. The editor library is replaceable behind a document/selection adapter; the persisted content contract must not depend on paid collaboration features.

For v1, one owner edits one post at a time. Debounced autosave carries a `draft_version` and returns the incremented version. A stale write returns conflict rather than overwriting newer content; the client retains unsaved text and offers reload/reconcile. Do not introduce CRDTs or collaborative presence for a single-writer diary. A local recovery buffer may protect against a temporary network failure, but PostgreSQL remains authoritative and the UI must distinguish local-only text from saved text.

## Minimal data model

Use a reviewed additive Drizzle migration. Exact names can be finalized with implementation, but the invariants should stay:

| Entity              | Stored data                                                                                                                                                                                                                  | Invariant                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blog_posts`        | owner ID, stable ID, unique slug, title, preset key or null, working document JSON + schema version, draft version, optional selected raw document JSON + capture time, publication state/current publication ID, timestamps | Private working state; only the owner APIs may read it. Preset is guidance metadata, not document structure.                                            |
| `blog_publications` | post ID, monotonically increasing version, frozen title/slug/refined document, optional frozen raw document, raw visibility flag, published time                                                                             | Append-only public snapshots. A current-publication pointer determines what public routes show; unpublish clears visibility without destroying history. |

Store no assistant conversation or suggestion history in v1. Suggestions contain an ephemeral ID, target passage/context, document version, proposed replacement, reason, and source mode. A raw snapshot is captured by explicit owner action, then copied into a publication only after owner preview and opt-in. Do not derive it from every autosave, Project Memory receipt, or model output. A publication can omit raw even if a private raw snapshot exists.

Slug uniqueness must be enforced by the database. Avoid unnecessary tables for outlines (ship them as versioned application data), AI sessions, tags, or media until a real use case exists. Define a later export format before making the editor schema difficult to migrate.

## Assistant contract and authorship

One bounded writing-assistant service supports two operations:

1. `suggestEdit`: receives the selected/current passage, a small amount of surrounding context, preset key, and intent (`grammar` or `clarity`); returns original quote, replacement, reason, and an optional confidence/ambiguity flag. It has no repository or publish tool.
2. `askQuestion`: receives the selected arc, a bounded excerpt or section summary, and already-dismissed question IDs for the current session; returns one short question and why it is relevant. It must not state an inference as a fact.

The client debounces checks after idle time and limits concurrent requests; the server enforces input size and per-owner rate limits. Avoid sending the entire private draft on every keystroke. Manual "ask" may use more owner-approved context, but Project Memory is **not** fetched automatically. If later connected, the owner explicitly selects an approved source; its text is untrusted context, never an instruction or publication authorization.

Suggestions are annotations, not document mutations. Anchor each to the current document version plus exact quoted text and local context/selection. Before acceptance, recheck the target in the current editor document; if it moved ambiguously or changed, invalidate and regenerate instead of applying at an old offset. Apply the accepted replacement as one editor transaction so undo works. Discard/reject needs no database write in v1. The assistant can ask questions but cannot insert the owner's answer, author an entire article, or call `publish`.

Failure modes are ordinary writing states: model unavailable means the editor still works; grammar errors do not block save or publish; suggestions never arrive as executable HTML. Make background feedback easy to pause for a post/session and do not imply every issue is detected.

## Publish protocol and public safety

1. Owner opens preview from a saved draft. Server returns the exact candidate refined content and, if present, the selected raw snapshot. The preview labels missing/changed raw clearly and shows the per-publish visibility toggle **off**.
2. Owner chooses slug and raw visibility, checks both public renderings, then invokes `publish` with the expected draft version and selected raw snapshot identity/hash. Server revalidates ownership, origin, content, size, links, and version. If anything changed after preview, return conflict and require a new preview.
3. In one database transaction, insert an immutable publication row and update the post's current-publication pointer/status. A publish retry uses an idempotency key or equivalent unique operation ID so it cannot create duplicate public versions.
4. Public readers resolve slug to the current publication only. A raw view is served only when that publication's `show_raw` is true. `unpublish` clears the public pointer/visibility transactionally; published history remains private for owner recovery.

Raw may contain unfinished thoughts or sensitive details. Present a human review checklist for names, credentials, client/work details, links, and claims, but do not imply automatic scanning makes publication safe. Public routes must not expose private drafts through metadata, previews, Open Graph generation, feeds, search indexing, or cache keys. Cache only current public snapshots and invalidate on publish/unpublish; authenticated drafts and assistant responses are `no-store`.

## Delivery and verification

1. Build the editor and four local outline guides; verify plain writing, keyboard navigation, autosave/error recovery, and changing presets without content loss.
2. Add Drizzle schema and owner-only draft APIs. Test optimistic concurrency, authorization, size/format validation, and reload persistence before AI.
3. Add bounded suggestions and questions with manual controls first, then idle-triggered feedback with a frequency cap. Test stale-anchor rejection, no silent edits, model failure, and muted mode.
4. Add immutable publish snapshots, preview, public index/article, raw opt-in, update, and unpublish. Test signed-out public access, private draft isolation, per-update raw default-off, and cache invalidation.
5. Validate the published flow on the hosted deployment with one real owner-written article or private test post. A local build alone is not hosted verification.

Keep portfolio authoring, custom domains, richer media, and automatic source retrieval out of this delivery path. Their future integrations should consume **published posts** or explicitly selected drafts, not turn Project Memory into a universal content pipeline.
