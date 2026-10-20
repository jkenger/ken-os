# UI package (`@ken-os/ui`)

Status: proposed, 19 Oct 2026. Plan only; nothing is built. The owner confirms the open questions at the end before PR 2.

On 19 Oct 2026 the owner decided that the shared components and the theme move out of `apps/web` into a workspace
package, so other apps in this repo can use them. This doc says what moves, what stays, how the package is laid out,
how the tools and guards follow it, and the PRs that get there. It started from a proposal made during the Design
Studio mockup work; where this doc differs from that proposal, it says so.

## Decisions

| Question                   | Decision                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name and place             | `@ken-os/ui` in `packages/ui`, next to `@ken-os/domain` and the others.                                                                                                                                       |
| Source or built            | Source, like the other packages. Apps compile it; no build step, no `dist`.                                                                                                                                   |
| What belongs in it         | Anything that runs unchanged in any React app here: it imports only React, npm libraries and other package files, uses only theme tokens, and assumes nothing about the app's shell, routes, sign-in or data. |
| Theme                      | The whole theme moves: the shadcn preset part and the Loots tokens. Each app keeps its own fonts and its app-only CSS.                                                                                        |
| Imports inside the package | `@ken-os/ui/...` paths, the way the shadcn CLI writes them in a monorepo. Never `@/`, which means the app's own `src`.                                                                                        |
| How apps import            | One file at a time (`@ken-os/ui/components/button`). No index file that exports everything.                                                                                                                   |
| First other user           | `apps/portfolio`, portfolio build step 2, not built yet. Not `packages/portfolio`: that holds the snapshot contract (zod only) and stays free of UI.                                                          |

Rejected: a built `dist` (the other packages ship source and Next compiles them), relative imports inside the package
(the CLI writes alias imports and would rewrite them on every `add`), one index file for all components (every app
would pull everything, and the CLI writes per-file imports), and keeping the Loots components in the registry folder
(see the guards section).

## What moves

All paths are under `apps/web/src` before and `packages/ui/src` after.

| From                                                                                         | To                       | Notes                                                                                                |
| -------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `components/ui/`: the 26 registry primitives                                                 | `components/`            | Only their import lines change                                                                       |
| `hooks/use-mobile.ts`                                                                        | `hooks/use-mobile.ts`    | Not in the proposal. The Sidebar primitive imports it and is its only user                           |
| `components/ui/pill.tsx`, `disclosure-summary.tsx`, `toaster.tsx`                            | `loots/`                 | Loots files, not registry items, so they leave the registry folder                                   |
| `components/page-heading.tsx`                                                                | `loots/page-heading.tsx` | Uses only Badge                                                                                      |
| `components/surfaces.ts`                                                                     | `lib/surfaces.ts`        | Class strings, like `cn`; the `lib/*` export resolves `.ts` files                                    |
| `app/globals.css`: the shadcn part and the Loots tokens (`topic-*`, `chapter-*`, `selected`) | `styles/globals.css`     | `selected` is needed by `surfaces.ts`; one file keeps every token where the Design Studio edits them |
| `lib/utils.ts` (copied, not moved)                                                           | `lib/utils.ts`           | `export { cn } from "cn"`. apps/web keeps its own copy, so its 16 importers don't change             |

The 26 primitives: alert, badge, button, card, collapsible, command, dialog, dropdown-menu, input, input-group, label,
native-select, popover, progress, separator, sheet, sidebar, skeleton, sonner, switch, table, tabs, textarea, toggle,
toggle-group, tooltip.

## What stays in apps/web

| File                                                            | Why it stays                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/ui/code-editor.tsx`                                 | CodeMirror brings five packages, three files use it (Engineering exercises and lab markdown), and the design bundle leaves it out. In the package, every app would install CodeMirror for one screen. It moves within apps/web to `components/lab/code-editor.tsx`, so `components/ui` empties out.                                                                            |
| `components/docked-panel.tsx`                                   | **Differs from the proposal.** Its sizing is measured against `WorkspaceShell`, which stays: the shell's 8px margin and 1px border, `top-2` and `h-[calc(100svh-5rem)]`. In another app's shell it would sit wrong. It has one user (the roadmap), and its likely second, the Design Studio, is in apps/web too. Move it when another app needs it, with the offsets as props. |
| `components/engineering/kit.tsx`                                | Imports `@ken-os/domain` (levels) and `next/link`, and Rail and Coverage are Engineering ideas. Its re-export of `panel` and `selectedSurface` points at the package instead.                                                                                                                                                                                                  |
| `components/workspace-shell.tsx`                                | The app frame: Next navigation, the term lookup, Engineering routes.                                                                                                                                                                                                                                                                                                           |
| `components/engineering/roadmap/status.tsx`, `chapter-mark.tsx` | Typed by `TopicStatus` from `@ken-os/domain` and proven on the roadmap only. They become candidates when apps/portfolio shows Engineering in public (portfolio step 3).                                                                                                                                                                                                        |
| Fonts in `app/layout.tsx`                                       | `next/font` runs per app. Each app picks its fonts and sets `--font-sans`, `--font-heading` and `--font-mono`.                                                                                                                                                                                                                                                                 |
| `app/globals.css`, now short                                    | `@import "@ken-os/ui/globals.css";` plus the app-only rules: smooth scrolling, the saved-term underline (`::highlight(ken-term)`) and `[data-term-hover]`. They are how Loots pages behave, not how components look.                                                                                                                                                           |
| `lib/utils.ts`                                                  | Unchanged; see above.                                                                                                                                                                                                                                                                                                                                                          |
| `design-system/components.ts`, `scripts/build-design-bundle.ts` | The bundle still includes `kit.tsx`, which stays (open question 3).                                                                                                                                                                                                                                                                                                            |
| The guard tests                                                 | See the guards section.                                                                                                                                                                                                                                                                                                                                                        |

## Package layout

```text
packages/ui/
  package.json
  components.json        shadcn CLI settings for the package
  tsconfig.json
  src/
    components/          registry primitives only, exactly as `shadcn add` writes them
    loots/               Loots components built from them: Pill, DisclosureSummary, Toaster, PageHeading
    hooks/use-mobile.ts
    lib/utils.ts         cn
    lib/surfaces.ts      panel, selectedSurface, selectedRow
    styles/globals.css   the shadcn preset part, then the Loots section
```

```json
{
  "name": "@ken-os/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "exports": {
    "./globals.css": "./src/styles/globals.css",
    "./components/*": "./src/components/*.tsx",
    "./loots/*": "./src/loots/*.tsx",
    "./hooks/*": "./src/hooks/*.ts",
    "./lib/*": "./src/lib/*.ts"
  },
  "scripts": { "check": "tsc --noEmit" }
}
```

- **Dependencies:** what the moved files import: `radix-ui`, `class-variance-authority`, `cn`, `cmdk`, `sonner`,
  `next-themes`, `@hugeicons/react`, `@hugeicons/core-free-icons` and `lucide-react` (DisclosureSummary only). Also
  `tw-animate-css` and `shadcn`, because `globals.css` imports `tw-animate-css` and `shadcn/tailwind.css` and Tailwind
  looks for them from the package folder.
- **Peer dependencies:** `react`, `react-dom` and `tailwindcss`, one copy each from the app. `tailwindcss` is also a dev
  dependency, so `@import "tailwindcss"` resolves from the package.
- **apps/web drops** what it no longer imports: `radix-ui`, `cmdk`, `class-variance-authority`, `next-themes`, `sonner`
  and both `@hugeicons` packages. A search on 19 Oct found no import of them outside `components/ui`.
- **CSS is imported only from CSS** (`@import "@ken-os/ui/globals.css"`), never from a `.tsx` file. The tsconfig path
  below maps `@ken-os/ui/*` to `src/*`, which would send a script import of `globals.css` to the wrong folder.

## Tailwind, shadcn CLI and TypeScript

### Tailwind 4 sources

- **Today:** there is no `@source`. Tailwind scans from the app folder: `@tailwindcss/postcss` 4.3.3 starts its scan at
  `process.cwd()`, which is `apps/web` under `next dev` and `next build`. That scan never reaches `packages/ui`.
- **The package scans itself.** Its `globals.css` gets one line at the top of the Loots section:
  `@source "../**/*.{ts,tsx}";`. An `@source` path is relative to the file it is in, so this means `packages/ui/src`
  and nothing else.
- **Apps keep the automatic scan** for their own files. The package does not add `@source "../../../apps/**"`, as the
  shadcn monorepo template does: that would put every app's classes into every app's CSS.
- **One Tailwind root per app.** The app's CSS imports the package's; it never imports `tailwindcss` itself.
- **PostCSS:** under Turbopack, Next 16.3 applies the app's `postcss.config` to every CSS file it builds unless
  `turbopackLocalPostcssConfig` is on (it is off here). The package needs no PostCSS config.
- **`transpilePackages`:** Turbopack compiles workspace packages on its own, but `@ken-os/ui` joins the other four in
  `next.config.ts` anyway, for webpack and to match.
- **Prettier:** `tailwindStylesheet` in `.prettierrc` becomes `./packages/ui/src/styles/globals.css`, the file with the
  theme the class sorter reads.

### shadcn CLI

`packages/ui/components.json` is new. The CLI requires the same `style`, `baseColor` and `iconLibrary` in both files, so
it copies `radix-luma`, `taupe`, `hugeicons`, `rsc`, `tsx`, `menuColor` and `menuAccent` from the app's file, with:

```json
{
  "tailwind": {
    "config": "",
    "css": "src/styles/globals.css",
    "baseColor": "taupe",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@ken-os/ui/components",
    "ui": "@ken-os/ui/components",
    "utils": "@ken-os/ui/lib/utils",
    "lib": "@ken-os/ui/lib",
    "hooks": "@ken-os/ui/hooks"
  }
}
```

`apps/web/components.json` changes three values; `components`, `lib` and `hooks` stay `@/...`:

| Key             | Now                   | After                                      |
| --------------- | --------------------- | ------------------------------------------ |
| `tailwind.css`  | `src/app/globals.css` | `../../packages/ui/src/styles/globals.css` |
| `aliases.ui`    | `@/components/ui`     | `@ken-os/ui/components`                    |
| `aliases.utils` | `@/lib/utils`         | `@ken-os/ui/lib/utils`                     |

Then `pnpm dlx shadcn@latest add <name>` in `apps/web`, or the shadcn MCP server in `.mcp.json`, writes a primitive into
`packages/ui/src/components` with `@ken-os/ui/...` imports, and writes any new variables into the package theme. The
registry primitives import `cn` from the `cn` package directly, so the `utils` alias doesn't touch them.

### TypeScript

- **`packages/ui/tsconfig.json`** is new: `strict`, `jsx: react-jsx`, `moduleResolution: bundler`, `noEmit`, and
  `paths: { "@ken-os/ui/*": ["./src/*"] }`. The CLI reads aliases through tsconfig paths, and
  `pnpm --filter @ken-os/ui check` type-checks primitives no app imports yet.
- **`apps/web/tsconfig.json`** adds `"@ken-os/ui/*": ["../../packages/ui/src/*"]` beside `"@/*"`. The CLI in apps/web
  uses it to find the package folder, and tsc, Turbopack and esbuild (the design bundle passes this tsconfig) use it to
  resolve the package's own `@ken-os/ui/...` imports to source.
- **Root `pnpm check`** adds `pnpm --filter @ken-os/ui check`.

## Guards

### `shadcn-primitives.test.ts`

It stays in `apps/web/src/lib` and runs with `pnpm test`.

- It scans every `.tsx` in `apps/web/src`. The `components/ui/` exemption goes once that folder is empty (PR 5), so
  CodeEditor is checked in its new home; it has no raw control today.
- It also scans `packages/ui/src/loots`: Loots components are built from primitives, the same rule as screens. Only
  `packages/ui/src/components`, the registry folder, is exempt. That is why the Loots files leave the registry folder.
- The allow-list entry for `components/lab-ui-preview/parts.tsx` goes; that file no longer exists.

### `shadcn-default.test.ts` (the default-theme guard)

- It scans `apps/web/src` and `packages/ui/src` for old Studio values.
- "globals.css is the shadcn default followed by the Loots section" reads `packages/ui/src/styles/globals.css`. The
  `@source` line sits inside the Loots section, so the default part is still exactly what the preset wrote and the
  start-of-file check doesn't change.
- A new check on `apps/web/src/app/globals.css`: it starts with `@import "@ken-os/ui/globals.css";` and has no
  `@import "tailwindcss"`, no Loots marker and no `:root` block, so tokens can live only in the package.

### `app-language-scan.ts`

It adds `packages/ui/src/loots` to what it scans. Toaster carries screen-reader text ("Notifications"), and today the
scan skips only the registry folder.

### The design bundle

`scripts/build-design-bundle.ts` stays in apps/web.

- **CSS:** it reads `packages/ui/src/styles/globals.css` instead of `src/app/globals.css`, with PostCSS `from` set to
  that path, and keeps its rewrites (dark variant, light colour scheme, fonts, `source(none)`). The package's own
  `@source` replaces `@source "../components/ui"`; `kit.tsx` and `workspace-shell.tsx` are added as `@source` lines
  relative to the package file.
- **JS:** `design-system/components.ts` re-exports from `@ken-os/ui/components/*`, `@ken-os/ui/loots/*` and
  `@ken-os/ui/lib/surfaces`; kit stays `@/components/engineering/kit`. `pnpm check` already type-checks this file, so a
  wrong path fails there.
- **No test runs the bundle.** Each PR that touches the CSS or `components.ts` runs
  `pnpm --filter @ken-os/web design:bundle` and checks it writes all four files at about the same sizes.

### Prettier ignore

In `.prettierignore`, `apps/web/src/components/ui` becomes `packages/ui/src/components`, and `apps/web/src/app/globals.css`
becomes `packages/ui/src/styles/globals.css`. The moved Loots files and the short app `globals.css` are formatted from
then on (inside `components/ui` they were ignored), so the PR that moves them formats them, or `pnpm check` fails.

## Design Studio manifest

The spec (`design-studio.md`) reads `components.json` and `components/ui`. After the move:

| Reads          | From                                                                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| CLI settings   | `packages/ui/components.json`                                                                                                                    |
| Primitives     | `packages/ui/src/components`                                                                                                                     |
| Loots wrappers | `packages/ui/src/loots`, `packages/ui/src/lib/surfaces.ts`, and from apps/web `components/engineering/kit.tsx` and `components/docked-panel.tsx` |
| Tokens         | The Loots section of `packages/ui/src/styles/globals.css`                                                                                        |

- The script stays in `apps/web/scripts`, since the studio is an apps/web module.
- A token edit patches the package's `globals.css`, so it changes every app that imports the theme.
- A component edit changes a wrapper in `packages/ui/src/loots` or a call site in an app; never a primitive.
- "This repo" stays one branch of the tree.

## PRs

Each leaves the app working and passes `pnpm check`, `pnpm test` and `pnpm build`. After each, open the app locally
and look at the roadmap (topic colours, the docked panel), Terms, Profile and a toast.

1. **`docs/ui-package`**: this doc.
2. **`feat/ui-package`**: the theme moves.
   - Create the package: `package.json`, `tsconfig.json`, `components.json`, `lib/utils.ts`.
   - Move the shadcn part and Loots tokens into `styles/globals.css`; the app's `globals.css` becomes the short import
     plus app-only rules.
   - Wire apps/web: `"@ken-os/ui": "workspace:*"`, `transpilePackages`, the tsconfig path, `tailwind.css` in
     `components.json`. Root `check`, `.prettierrc`, and the `globals.css` line in `.prettierignore`.
   - Default-theme guard reads the new file and checks the short one; the bundle reads the package CSS.
   - Proof: the app's built CSS has the same rules before and after (diff the `.next` CSS, ignoring order).
3. **`refactor/ui-primitives`**: the 26 primitives move.
   - `git mv` them and `use-mobile.ts`; update their imports and the app's (about 160 import lines in 41 files).
   - `ui` and `utils` aliases in the app's `components.json`; package dependencies; apps/web drops `radix-ui`, `cmdk`,
     `class-variance-authority`, `next-themes` and the `@hugeicons` packages; `.prettierignore`;
     `design-system/components.ts`.
   - Proof: `git diff -M` shows renames with only import lines changed. In apps/web,
     `pnpm dlx shadcn@latest add --overwrite badge` writes `packages/ui/src/components/badge.tsx` and nothing in
     apps/web; discard any content change, which is the registry having moved on.
4. **`refactor/ui-loots-components`**: Pill, DisclosureSummary, Toaster and PageHeading move to `src/loots`, and
   `surfaces.ts` to `src/lib`. Update imports, the `kit.tsx` re-export and `components.ts`; format the moved files;
   apps/web drops `sonner`; the primitives guard and the app-language scan add `packages/ui/src/loots`.
5. **`refactor/code-editor-to-lab`**: CodeEditor moves to `apps/web/src/components/lab/code-editor.tsx` (three
   importers). `apps/web/src/components/ui` is gone, so the guard's exemption, its stale entry and the
   `.prettierignore` line for that folder go too.
6. **`docs/ui-package-done`**: `AGENTS.md`, `.claude/CLAUDE.md` (the stack line), `design-system.md`,
   `design-system-shadcn-setup.md`, `design-studio.md` and the `design-system-sync` skill name the new paths, and this
   doc becomes Implemented. The preset name in `AGENTS.md` and the `shadcn-default.test.ts` comment was fixed to Luma on
   20 Oct 2026. PRs 2 to 5 each already fix the `AGENTS.md` line that names a
   path they move.

## Later: apps/portfolio

When portfolio step 2 builds the site:

- It adds `"@ken-os/ui": "workspace:*"`, its own `components.json` with `ui` and `utils` pointing at the package, and
  the tsconfig path.
- Its own `globals.css` imports `@ken-os/ui/globals.css`, then sets its own `:root` values for the look it wants. Its
  fonts come from its own `next/font` calls.
- apps/web's guards don't apply to it (`portfolio.md`).

## Open questions

1. **DockedPanel stays in apps/web**, against the starting proposal. Recommendation: confirm. It is built around the
   shell's measurements, and its only users are in apps/web; move it with props for the offsets when another app needs
   it.
2. **Does apps/portfolio take the Loots theme, or only the components?** Recommendation: one `globals.css` now, and the
   portfolio overrides variables after importing it. Split it into a base file and a theme file only if overriding gets
   awkward in portfolio step 4. Luma's shapes (radius, sizes) live in the primitives' class strings, so the portfolio
   gets those either way.
3. **Where the design bundle lives.** Recommendation: apps/web while it bundles `kit.tsx`. Move it to `packages/ui`
   once it bundles only package files.
4. **Where the guard tests live.** Recommendation: apps/web for now, so `pnpm test` stays one command and the rules stay
   with the one app they bind. Give the package its own `test` script when apps/portfolio depends on it.
5. **Two icon sets in the package**: Hugeicons (the preset's) and Lucide (DisclosureSummary's chevron). Recommendation:
   move it as is, and switch the chevron to Hugeicons in its own PR, since that is a look change.
6. **Order with the Design Studio.** Recommendation: land PRs 2 to 5 before Studio step 1, so its manifest is written
   once, against the package's paths.
