# Design Studio — architecture spec

Status: agreed with the owner on 19 Oct 2026. Steps 1 (manifest and tree), 2 (graph) and 3 (inspector and drafts) are built; steps 4 and 5 are not. The screens are drawn from [the mockup brief](../mockups/design-studio.md).

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

## Decided after the mockups

Agreed with the owner on 19 Oct 2026, from the open questions in the mockup handoff (project files, `design-studio-mockups/README.md`; canvas [Design Studio mockups](https://claude.ai/artifact/SJTbQ5ZZaMPnw7UpvY8H8c)).

1. **First open** is 100% on the top row of This repo, not fitted: fitting lands near 33%, below the 50% cutoff where nodes show names only. **Fit** stays one click away.
2. **Installed shadcn components** keep a row in both This repo and shadcn/ui. The shadcn/ui row shows Installed and selects the This repo node; the canvas draws each component once.
3. **The tree's default filter** is All, so the catalogue is visible.
4. **Registry items without a description**: the manifest script copies the docs one-liners when it runs, and the UI shows nothing when there is none.
5. **Edges between libraries** (Calendar uses Button) show only for the picked or hovered node.
6. **Token edits to shadcn tokens** are always an override in the Loots section of `globals.css`, never an edit of the base.
7. **A large registry's area** (Magic UI) stays folded on the canvas until its tree branch is opened.

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

Drafts live in a `design_studio_drafts` table under the owner: kind (token or component), target (the token name or the component id), the change as JSON, and updated time, one row per token or component. They survive a refresh and a change of device.

Export:

1. **Copy as patch**: the draft rendered as a diff against the manifest's source, for pasting into a local checkout.
2. **Through the connector**: a read-only connector tool returns the current drafts, so the owner can tell Claude Code "apply my studio drafts" and it opens the PR. Applying marks the drafts done once the PR merges.

## Build order

Each step is its own PR and leaves the app working. Each one names the frames on the [mockup canvas](https://claude.ai/artifact/SJTbQ5ZZaMPnw7UpvY8H8c) it must match; the canvas is the reference for the screen, this spec for the behaviour.

To build a step: open the named frames on the canvas before writing UI (their artboard source has the exact layout, spacing and copy), and before the PR put screenshots of the built page beside the same frames and close the gaps. Anything left different on purpose is listed in the PR.

1. **Manifest and tree.** The script, the manifest for this repo only, `/studio` with the tree and a single-component preview. Frames: the workspace frame from A1 and A2 (page title row, tree column, canvas column, inspector column), tree B1, B2, B5 and B6 without the Library, Installed and Changed filters (one library, no drafts yet), the picked component as one node like C1 and C2, C9 for a preview that fails, the inspector header and facts from D2 without its tabs and controls, and G1 to G3 for smaller screens. Built 19 Oct 2026 and rebuilt against these frames the same day. Previews are written by hand in `components/design-studio/previews.tsx`. Different from the frames on purpose until a later step:
   - no Export button or Changed badge in the title row (step 3);
   - the inspector lists exports and variant groups read-only, with no tabs, controls, close button or Theme view (step 3);
   - from 1024 to 1279 px the inspector sits under the canvas instead of in G2's sheet, which comes with its controls (step 3);
   - no section toggle in the top bar, since the studio has no section column.
2. **Graph.** All installed components as live nodes with dependency edges; shared selection with the tree. Frames: A1 and A2 canvas, C1 to C8, the C6 toolbar. Built 19 Oct 2026. The manifest gains `uses`, each primitive's imports from other `components/ui` files, which are its registry dependencies. `layoutGraph` in `features/design-studio/manifest.ts` places nodes five to a row in tree order and routes each edge through the gaps between nodes. The tree's find also filters the canvas, and the toolbar's Find focuses it. Previews are cut down to one sample that fits a 240 by 180 node. Different from the frames on purpose until a later step:
   - with nothing in the address, the first row (Alert) is picked, as in step 1, since A1's Theme view comes with the inspector (step 3);
   - hovering a node lights its edges even while another node is picked, where C5 shows hover with nothing picked;
   - under 1024 px the canvas still shows the picked component alone (G3), not the graph;
   - no shadcn/ui area, cards or Not installed nodes (C3), which come with the other libraries (step 4).
3. **Inspector and drafts.** Variant, prop and token controls, live re-render, the drafts table, Copy as patch. Frames: D1 to D6, D8, F, A3, A4, B3, B7, E1, E2, E5, G2's inspector sheet. Built 20 Oct 2026; screenshots beside the frames are in project files, `design-studio-mockups/step-3-check`. How it works:
   - The manifest gains each component's theme `tokens` (from its utility classes, `radius` for any rounded class), a primitive's root `slot`, a Loots wrapper's own `source` lines, the `theme` (every `:root` and `.dark` token in `globals.css`), and the end of `globals.css` for the token patch.
   - Nothing in the address shows the Theme (D1); picking a component shows its Preview, Look and Tokens tabs. Preview props come from `previewProps` in `previews.tsx` and never make a draft.
   - Edits re-render at once through one generated style tag (`draftStyles` in `features/design-studio/drafts.ts`): token overrides on every preview surface (`data-studio-preview`), light and dark apart, and each Look on the `data-slot` element its node's className reaches (a one-variant Look also matches the preview's `data-studio-variant`). A token defined as `var(--other)`, such as `--selected`, is declared again on previews so an override of the other reaches it. Studio chrome never changes. A token change rings the nodes that use it for a second (F).
   - Drafts save 1 second after the last change through `PUT /api/studio/drafts`, which checks every value against the manifest; Reset, Discard and Discard all delete at once.
   - Copy as patch writes a unified diff that `git apply` takes: token overrides appended to the Loots section of `globals.css`, a primitive's Look as a new wrapper in `components/loots/<name>.tsx`, and a wrapper's Look as an edit of its own lines (its `variant` and the classes in its first `cn()`).

   Different from the frames on purpose:
   - facts show no Package row and paths start at `apps/web/src`, since `@ken-os/ui` doesn't exist yet;
   - the Theme has no close button, since it is what closing goes back to;
   - Export has no Patch and Claude tabs, only the patch; the Claude tab (E3) comes with the connector tool in step 5;
   - Look's Variant select for a primitive starts on All variants, and a wrapper's Look has the same parts as a primitive's (D6 draws only Variant, Radius, Height and Font weight);
   - Look's colours start on Default with an empty swatch, since a computed colour can't be named as a token;
   - Look is offered where the studio can style the live element: primitives whose first export passes its className to a `data-slot` element (not Radix roots such as Dialog), and wrappers built on one that pass it classes (today the kit Badge). Others read "Nothing to restyle";
   - the tree's Changed switch sits under Find on its own, since the Library and Installed filters beside it come with step 4.

4. **Other libraries.** shadcn/ui and chosen registries as metadata branches and graph cards. Frames: B1's Library, Installed and Changed filters, B4, C3, D7. Built in small PRs: the registry snapshot, the tree and the inspector, the graph cards, then Magic UI.
   - `pnpm --filter @ken-os/web studio:registries` fetches each library into `features/design-studio/registries.snapshot.json`, which is committed; `studio:generate`, `pnpm check` and the build read only the snapshot, so none of them needs the network. Run it by hand to pick up a registry's changes, then `studio:generate`.
   - shadcn/ui is read from its source on GitHub: `apps/v4/public/r/index.json` (what `ui.shadcn.com/r/index.json` serves) for the items and their registry dependencies, and each docs page's frontmatter for its one-liner. Only items with docs for this repo's base (the `radix` of `radix-luma`) are listed, since `shadcn add` can't install the others here; the mockups' Attachment, Bubble, Form and the other Aria-only items are therefore missing.
   - The manifest gains `libraries`: each item's id (`shadcn/form`), name, description, the components it uses (this repo's id when installed here, such as `ui/button`), `installed` when this repo has a primitive of the same name, its `shadcn add` command and its docs link.
   - The tree gains B1's Library select, Installed and All, and the Changed switch beside them, and a branch per library (B4). An installed item reads Installed and picks This repo's node; Changed keeps installed items whose This repo component has a draft. Picking a library is the same as opening its branch. The Library and Installed filters apply to the tree only until the graph cards come.
   - An item that isn't installed opens its own inspector (D7): Not installed, its description, Library, Uses as links, the add command with Copy, and Docs. It has no tabs, and the canvas picks nothing until it has the card.
5. **Connector export.** The drafts tool and the apply-through-Claude flow. Frames: E3, and the E4 note.

Later, once the inspector has been used: decide on an AI tab (shadcn's AI Elements needs the Vercel AI SDK and a model key in the app).
