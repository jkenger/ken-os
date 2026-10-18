# Portfolio — architecture spec

Status: agreed with the owner on 18 Oct 2026. Step 1 is built (Profile only); steps 2 to 4 are not.

The portfolio is the owner's public site, for hiring and for showing what he builds. It is also the playground for what Loots can do: it shows Loots data and can try features Loots does not have yet.

## Decisions

| Question                 | Decision                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Where it lives           | A separate app in this monorepo, `apps/portfolio`, plus a private Portfolio module inside `apps/web`.        |
| Live or published        | Published. Nothing goes public until the owner presses Publish.                                              |
| Publish                  | One Publish in the Portfolio module covers everything, as one snapshot. Modules do not publish on their own. |
| Domain                   | The owner's own domain, on its own Vercel project.                                                           |
| How it reads Loots       | A public Loots endpoint that returns the current snapshot as JSON. Never the database.                       |
| When it updates          | Cached pages, refreshed when Loots notifies it after a Publish.                                              |
| First content            | Profile, and Engineering as learning in public.                                                              |
| Engineering explanations | The owner's own explanation behind a Learned topic is a per-topic switch, off by default.                    |
| Experiments              | The portfolio may build features Loots lacks; ones the owner wants privately move into Loots later.          |
| Resume public link       | Not built on its own. Profile step 4 (`/r/<slug>`) is replaced by the portfolio's resume section, later.     |
| Visitor chat             | Not planned. The owner's own AI agent comes later and reads the same endpoint.                               |

Rejected: a separate repo (more friction, nothing gained for one owner), the portfolio reading Postgres (it would hold database credentials and could reach private tables), MCP as the data source (it is Claude's way into Loots, not a website's), and a live read without Publish.

## Shape

```text
Owner ── Loots /portfolio (private module) ── Publish ── portfolio_publications (Postgres)
                                                  │
                                                  └─ POST revalidate ──┐
                                                                       ▼
Visitor ── apps/portfolio (own domain) ── GET /api/public/portfolio ── current snapshot only
```

## Loots side (`apps/web`)

- **Portfolio module** at `/portfolio`, behind the owner session like every other module. It shows what the next snapshot will contain, the per-topic explanation switches, and Publish and Unpublish. Code in `src/features/portfolio/`.
- **Snapshot**: Publish reads Profile and Engineering, builds one JSON document that matches the contract, and inserts it into `portfolio_publications` (append only: version, document, published time) with a current-publication pointer, in one transaction. Unpublish clears the pointer. This follows the Blog spec's publish protocol (`blog-writing-studio.md`).
- **What a snapshot never holds**: email, phone, address, user id, Drive ids, tokens, notes, exercises, and any explanation the owner has not switched on. The builder copies allowed fields, never strips a full record.
- **Public endpoint** `GET /api/public/portfolio`: no session, reads only the current publication, returns 404 when nothing is published. It is the first Loots route outside the owner gate, so `auth-sign-in.md` and `overview.md` get a public-routes section when it ships.
- **Notify**: after Publish or Unpublish, Loots calls the portfolio's revalidate route with a shared secret (`PORTFOLIO_REVALIDATE_SECRET`). A failed call does not undo the Publish; the screen shows it and offers a retry.

## Contract (`packages/portfolio`)

A zod schema and its types for the snapshot, with a `version` number. Both apps import it, so a change to the shape is one reviewed diff. New sections are added as optional fields so an older portfolio deploy keeps working.

## Portfolio side (`apps/portfolio`)

- Its own Next.js app and Vercel project. No database, no session, no Google or model credentials. Its only Loots settings are `LOOTS_URL` and `PORTFOLIO_REVALIDATE_SECRET`.
- Fetches the endpoint with a cache tag; the revalidate route refreshes that tag. If Loots is down, the last cached pages keep serving. If nothing is published yet, it shows a plain holding page instead of failing the build.
- Its own look. `apps/web`'s rules (the shadcn default look and the primitive guards in `src/lib/shadcn-*.test.ts`) do not apply here; it may borrow Loots components when they fit.
- Experiments live here. When one is worth having privately, it moves into a Loots module and the snapshot carries its data.

## Build order

Each step is its own PR and leaves both apps working.

1. **Contract and Publish.** `packages/portfolio`, `portfolio_publications` migration, the Portfolio module with Publish and Unpublish for Profile only, and the public endpoint.
2. **The site.** `apps/portfolio` with a plain page showing the published Profile, the revalidate route, its Vercel project and domain.
3. **Engineering in public.** Roadmap, statuses and Claude's reviews in the snapshot, with the per-topic explanation switch.
4. **Design.** The creative part, built on real published data.

Owner to do before step 2: pick the domain and create the Vercel project (or let Claude create it).
