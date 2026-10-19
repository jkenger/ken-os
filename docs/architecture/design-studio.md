# Design Studio — architecture spec

Status: agreed with the owner on 19 Oct 2026. Nothing is built yet. The screens are drawn from [design-studio-mockups.md](design-studio-mockups.md).

The Design Studio is a private workspace in Loots for seeing and tuning the app's components. It lists every component in the repo and in the shadcn libraries the owner might add, renders the installed ones live, and lets the owner change their look with instant feedback. Changes are saved as drafts and turned into code by export. The studio does not write to the codebase itself.

## Decisions

| Question                  | Decision                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Where it lives            | A private module inside `apps/web`, behind the owner session. No new app or service.                                    |
| Layout                    | A workspace: component tree on the left, graph canvas in the centre, inspector on the right.                            |
| Libraries                 | One tree, each library a branch: "This repo" first, then shadcn/ui, then registries built on shadcn. A filter switches. |
| How it knows what is here | A build-time manifest read from `components.json` and `components/ui`. The deployed app cannot read its own source.     |
| Other libraries           | Metadata only, from each registry's JSON: name, description, dependencies, and the `shadcn add` command. No live code.  |
| Graph                     | Every component as a live node; edges are registry dependencies (sidebar uses sheet, button, input).                    |
| Right panel               | Inspector first: variants, props and theme tokens. An AI tab is decided after the inspector has been used.              |
| Custom components         | No third library. "This repo" is the custom library; edited components carry a draft mark and a "Changed" filter.       |
| Where edits go            | Drafts in Postgres. Export turns them into code: "Copy as patch" first, then Claude applies them through the connector. |

Rejected: compiling uninstalled registry code in the browser (running third-party code inside the signed-in app, and a compiler to maintain), a separate "Custom" library (it would list the same button twice), the app writing to the repo or opening PRs itself (it has no GitHub access and should not), and in-app AI chat for the first slice (Loots makes no model calls today; AI lives in Claude, per `engineering-claude-first.md`).

## Shape

```text
build ── manifest script ── components.json + components/ui + registry JSON ── studio manifest (generated)
                                                                                     │
Owner ── /studio ── tree ─┬─ graph (React Flow, live nodes) ─┬─ inspector ── draft (Postgres)
                          └──────── same selection ──────────┘                    │
                                                                                  ├─ Copy as patch
                                                                                  └─ connector tool ── Claude Code ── PR
```

## The workspace

- **Route** `/studio`, code in `src/features/design-studio/` and `src/components/design-studio/`. Reuses `workspace-shell.tsx` and `DockedPanel` where they fit; extract shared pieces only when a second page needs them (`design-system.md`).
- **Tree**: library branches, then components, then any Loots wrappers nested under the primitive they wrap, labelled Loots. Edited components show a dot. Filters: library, Installed or not, Changed.
- **Graph**: `@xyflow/react`, already used by the roadmap graph. Installed components render live in their node; uninstalled ones render as a metadata card. Selecting in the tree or the graph selects the same component.
- **Inspector**: controls built from the component's variants and props, plus the theme tokens it uses. Every change re-renders the node and the tree preview at once from the draft, with no save round trip.

## The manifest

A script in `apps/web/scripts/`, run like `lab:generate`, writes a typed manifest the studio imports:

- **This repo**: each file in `components/ui`, its exports, and its cva variants where it has them; Loots wrappers from the files the design system names (`components/surfaces.ts`, `components/engineering/kit.tsx`).
- **Other libraries**: shadcn/ui and each chosen registry, from their public registry JSON, fetched when the script runs and committed with the manifest so the build never depends on a registry being up. Which registries to include is a list in the script.

`pnpm check` fails when the manifest is out of date, the same way it does for lab content.

## Edits and export

The design system's rules decide what an edit can be, so the studio never produces a change the guards would reject:

- **Token edits** change a variable in the Loots section of `globals.css` and affect every component at once.
- **Component edits** create or change a Loots wrapper or a variant at the call site, never the primitive (`shadcn-primitives.test.ts`).

Drafts live in a `design_studio_drafts` table under the owner: component, kind (token or component), the change as JSON, and updated time. They survive a refresh and a change of device.

Export:

1. **Copy as patch**: the draft rendered as a diff against the manifest's source, for pasting into a local checkout.
2. **Through the connector**: a read-only connector tool returns the current drafts, so the owner can tell Claude Code "apply my studio drafts" and it opens the PR. Applying marks the drafts done once the PR merges.

## Build order

Each step is its own PR and leaves the app working.

1. **Manifest and tree.** The script, the manifest for this repo only, `/studio` with the tree and a single-component preview.
2. **Graph.** All installed components as live nodes with dependency edges; shared selection with the tree.
3. **Inspector and drafts.** Variant, prop and token controls, live re-render, the drafts table, Copy as patch.
4. **Other libraries.** shadcn/ui and chosen registries as metadata branches and graph cards.
5. **Connector export.** The drafts tool and the apply-through-Claude flow.

Later, once the inspector has been used: decide on an AI tab (shadcn's AI Elements needs the Vercel AI SDK and a model key in the app).
