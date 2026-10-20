# Reset to the shadcn default setup

Partly superseded on 13 Oct 2026: the app moved from the Nova preset described below to the Luma preset (`radix-luma`, base colour `taupe`, Public Sans body, DM Sans headings, Geist Mono) in commit `650cb33`. Building on an untouched shadcn default still holds; the Nova values and the Geist body font below are history.

Status: approved by the owner, 10 Oct 2026. Implemented on 10 Oct 2026 on branch `refactor/shadcn-default`, with shadcn CLI 4.21.4. The owner checked the hosted preview on 10 Oct 2026, so every point in §11 is met.

Implementation notes:

- The scratch app's `ThemeProvider` (next-themes, with a "d" key that toggles dark mode) was left out of `layout.tsx`, since turning dark mode on is a later decision (§6). Without it, the registry `sonner.tsx` would follow the system theme, so the Loots `toaster.tsx` passes `theme="light"`.
- The visible-focus rule was dropped: shadcn's base gives every element `outline-ring/50`, and the primitives bring their own focus rings (§4).
- The Button's `text` variant and `ButtonEndIcon` were Loots additions; screens now use the `link` variant and an icon with `data-icon="inline-end"`.
- Fixed pixel sizes became the nearest Tailwind step: type to the `text-*` scale, tracking and leading to the named steps, spacing to the documented spacing steps, and wide `max-w` values to the container scale.
- The preview bundle keeps working (§8, recommended option): `bundle.css` carries the default variables and a Geist font link that only the previews load.

## Decision

Every visual value in Loots resets to shadcn's default for this project, and the owner builds Loots' own look on top of that later, one deliberate change at a time.

"Every value" means all of it: colours, Loots-only colours, status colours, fonts, radii, shadows, sizes, spacing, and the look tailored into the components in `components/ui`. Nothing from the Ken OS design system (Studio 1.0.0) survives as a value.

The default is what `shadcn init` produces for this project's `components.json` (style `radix-nova`, base colour `neutral`, icon library `lucide`), which is shadcn 4's **Nova** preset:

| Setting      | Nova default                                      |
| ------------ | ------------------------------------------------- |
| Colours      | Neutral theme, light and dark, in oklch           |
| Body font    | Geist, loaded with `next/font`                    |
| Heading font | Inherits the body font (Geist)                    |
| Mono font    | Geist Mono, loaded with `next/font`               |
| Radius       | `--radius: 0.625rem`, with shadcn's derived sizes |
| Charts       | Neutral chart colours `--chart-1` to `--chart-5`  |
| Menus        | Default colour, subtle accent                     |
| Icons        | Lucide                                            |

Two layers from now on:

| Layer            | What it is                        | Where                                                                                                |
| ---------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Base**         | shadcn's default output, unedited | `globals.css` (standard part), `layout.tsx` fonts, `components/ui` as the registry ships them        |
| **Build on top** | Anything the owner adds later     | A labelled "Loots" section at the end of `globals.css`, and Loots components outside `components/ui` |

The build-on-top layer starts empty.

## What this replaces

- The rule in `AGENTS.md` that the claude.ai design system is the source of truth for the app's look, and the token pipeline behind it: `design-system/tokens.json` → `design:generate` → `design-tokens.generated.css`.
- The tailoring notes in `docs/architecture/shadcn-audit.md`.
- The look half of the `design-system-sync` skill.

The claude.ai design system stays as the owner's reference for what to build on top. It no longer drives the app.

## 1. How to get the exact default

Don't hand-write the default. Generate it:

1. In a scratch folder outside the repo, create a Next.js app and run `pnpm dlx shadcn@latest init` with the same settings as `apps/web/components.json`: Next.js, style `radix-nova`, base colour `neutral`, CSS variables on, lucide.
2. Copy from that scratch app, word for word:
   - its `globals.css` (imports, `@custom-variant dark`, `@theme inline`, `:root`, `.dark`, `@layer base`)
   - its `layout.tsx` font setup (the `next/font` calls, the variables and classes on `<html>`)
3. Re-add every primitive Loots uses from the registry with overwrite, so each one is the shipped default:
   `pnpm dlx shadcn@latest add --overwrite badge button card collapsible command dialog dropdown-menu input-group input label native-select separator sheet sidebar skeleton sonner switch table tabs textarea toggle-group toggle tooltip`

Record the shadcn CLI version used in the PR description.

## 2. Files

| File                                                                                                      | After the reset                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/app/globals.css`                                                                            | The scratch app's `globals.css` exactly, followed by an empty `/* Loots: additions on top of the shadcn default */` section. Keep only the behavior rules that aren't look (see §4) |
| `apps/web/src/app/layout.tsx`                                                                             | The scratch app's font setup (Geist and Geist Mono via `next/font`), plus Loots metadata                                                                                            |
| `apps/web/src/app/design-tokens.generated.css`                                                            | Deleted                                                                                                                                                                             |
| `apps/web/design-system/tokens.json`                                                                      | Deleted (git history keeps it)                                                                                                                                                      |
| `apps/web/scripts/generate-design-tokens.ts`, `src/lib/design-tokens.ts`, `src/lib/design-tokens.test.ts` | Deleted                                                                                                                                                                             |
| `apps/web/package.json`                                                                                   | Remove `design:generate` and its `--check` step from `check`                                                                                                                        |
| `components/ui/*` registry primitives                                                                     | Overwritten with the registry default (§1 step 3)                                                                                                                                   |
| `components/ui/code-editor.tsx`, `disclosure-summary.tsx`, `pill.tsx`, `toaster.tsx`                      | Not registry items. Keep their behavior; replace every Loots value in them with shadcn tokens or Tailwind defaults (§3)                                                             |
| `components.json`                                                                                         | Unchanged                                                                                                                                                                           |

No `@import` of Google Fonts. Fonts come only from `next/font`.

## 3. Replacing Loots classes in screens

Screens outside `components/ui` use Loots-only tokens. Every one is replaced with a shadcn token or a Tailwind default, so no Loots value is left. Affected: 28 files in `components/engineering`, `components/lab`, `components/resume-workspace.tsx`, `components/workspace-shell.tsx`, and the UI files above.

| Loots class or token                                                                                                                                    | Uses           | Replace with                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bg-canvas`                                                                                                                                             | 3              | `bg-background`                                                                                                                                                                                                                                                                                      |
| `text-quiet`                                                                                                                                            | 21             | `text-muted-foreground`                                                                                                                                                                                                                                                                              |
| `signal` (`text-signal`, `bg-signal`, `border-signal`, `ring-signal`)                                                                                   | 32             | the same with `primary`                                                                                                                                                                                                                                                                              |
| `primary-hover`                                                                                                                                         | 2              | `hover:bg-primary/90` (the shadcn button pattern)                                                                                                                                                                                                                                                    |
| `bg-tint`, `bg-table-head`                                                                                                                              | 7              | `bg-muted`                                                                                                                                                                                                                                                                                           |
| `bg-row-hover` / `hover:bg-row-hover`                                                                                                                   | 6              | `hover:bg-muted/50` (the shadcn table pattern)                                                                                                                                                                                                                                                       |
| `bg-rail`                                                                                                                                               | 14             | `bg-muted`                                                                                                                                                                                                                                                                                           |
| `bg-rail-lit`                                                                                                                                           | 2              | `bg-primary`                                                                                                                                                                                                                                                                                         |
| `bg-rail-soft`                                                                                                                                          | 4              | `bg-primary/40`                                                                                                                                                                                                                                                                                      |
| `status-gap`, `status-gap-surface`                                                                                                                      | 8              | `text-destructive`, `bg-destructive/10`                                                                                                                                                                                                                                                              |
| `status-solid`, `status-partial` and their surfaces                                                                                                     | 27             | shadcn has no success or warning colour. Use the shadcn `Badge` variants for status: Solid → `default`, Partly there → `secondary`, Gap and Misconception → `destructive`, others → `outline`. Plain-text status uses `text-foreground`. The icon and the word carry the meaning, never colour alone |
| `shadow-panel`                                                                                                                                          | 20             | Remove. A `Card` brings shadcn's own border and shadow; anything else that needs a surface uses `Card` or `border bg-card`                                                                                                                                                                           |
| `shadow-tab`                                                                                                                                            | 6              | Remove; `Tabs` brings its own active style                                                                                                                                                                                                                                                           |
| `rounded-*` with Loots radii                                                                                                                            | all            | Unchanged class names; they now resolve to shadcn's radius scale                                                                                                                                                                                                                                     |
| `font-display`                                                                                                                                          | 29 in 12 files | `font-heading` (resolves to Geist, same as body)                                                                                                                                                                                                                                                     |
| `font-[750]`, `font-[650]`                                                                                                                              | 9              | `font-bold`, `font-semibold`                                                                                                                                                                                                                                                                         |
| Fixed Loots sizes in class strings (`h-[44px]` for controls, `w-[208px]` section column, `h-[56px]` header and similar copied from the old size tokens) | many           | The shadcn component's own size, or the nearest Tailwind default step                                                                                                                                                                                                                                |
| Hardcoded hex colours, if any                                                                                                                           |                | A shadcn token                                                                                                                                                                                                                                                                                       |

After this, a search of `apps/web/src` for `canvas`, `quiet`, `signal`, `tint`, `table-head`, `row-hover`, `rail`, `status-`, `shadow-panel`, `shadow-tab`, `font-display`, `font-[`, and `#` colour literals returns nothing outside comments.

## 4. Behavior rules that stay

These aren't look, so they stay in the "Loots" section of `globals.css`:

- `html { scroll-behavior: smooth; }`
- The visible focus outline on `button, input, a, summary` only if the shadcn default doesn't already give those elements one. Check after the reset; shadcn's base gives `outline-ring/50` everywhere.

The thin scrollbar rules go; they set colours and sizes.

## 5. Fonts everywhere

With Geist on `<html>` and shadcn's base styles, every page, dialog, popover and form control inherits it. Two places don't inherit and need a token, not a value:

- **Toasts:** Sonner sets a system font on `[data-sonner-toaster]`. If the registry `sonner.tsx` still leaks after the overwrite, add `style={{ fontFamily: "var(--font-sans)" }}` with a one-line comment. This is the only allowed edit to a registry primitive in the reset.
- **Code editor:** `code-editor.tsx` uses `var(--font-mono)` instead of its inline font list.

The resume preview iframe shows Google's page in Google's fonts and stays that way.

## 6. Dark mode

The default ships a `.dark` block, so it stays in `globals.css` as generated. Loots doesn't switch themes today; nothing adds the `dark` class. Turning dark mode on is a later build-on-top decision.

## 7. Tests and checks

| Test                                                                          | After the reset                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/design-tokens.test.ts` (contrast of Loots colours)                   | Deleted with the tokens. shadcn's neutral defaults are trusted as shipped                                                                                                                       |
| `src/lib/shadcn-primitives.test.ts` (no raw controls outside `components/ui`) | Kept                                                                                                                                                                                            |
| New `src/lib/shadcn-default.test.ts`                                          | Fails if `apps/web/src` contains any Loots token name from §3, a `font-display` class, a Google Fonts URL, or a hex colour in a class string. Allows the empty "Loots" section in `globals.css` |
| `pnpm check`                                                                  | No longer runs the token generator                                                                                                                                                              |

## 8. Design preview bundle

`design:bundle` builds the app's real components for the claude.ai design system's previews. Previews run outside Next, so `next/font` doesn't reach them. Either:

- **(recommended)** keep the bundle and load Geist in the preview with a font link inside the preview only, or
- pause `design:bundle` until the owner restarts the design system on top of the default.

The `design-system-sync` skill keeps only its component direction (bundle and publish). Its token pull is removed, since there are no tokens to pull.

## 9. Docs to update

- `AGENTS.md`: the design-system bullet and the shadcn bullet say the app runs on shadcn's Nova default, `globals.css` holds it, Loots additions go in the labelled section, and the claude.ai design system is reference only. Remove "tailored to the Ken OS design system (the Studio look…)".
- `docs/architecture/shadcn-audit.md`: mark as superseded by this document.
- `.agents/skills/design-system-sync/SKILL.md`: token steps removed (§8).
- The owner's global `CLAUDE.md` design principles list "Untouched shadcn UI" (11) as something to avoid. This reset uses untouched shadcn on purpose, as the starting point to build on. Record that reason in `AGENTS.md` so later sessions don't "fix" it.

## 10. Slices

| #   | Branch                            | Covers                                                                                                                                             |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `refactor/shadcn-default-base`    | §1 and §2: scratch init, `globals.css`, `layout.tsx` fonts, delete the token pipeline, overwrite registry primitives, Sonner and code editor fonts |
| 2   | `refactor/shadcn-default-screens` | §3: replace every Loots class in screens, the new test, `pnpm check` change                                                                        |
| 3   | `docs/shadcn-default-done`        | §8 and §9: preview bundle fonts, skill and docs updates, this file's status to Implemented                                                         |

Slices 1 and 2 may need to land together if slice 1 alone breaks the build (removed tokens leave unknown classes). If so, do them as one PR with two commits.

## 11. Done when

1. `globals.css` matches a fresh `shadcn init` for this `components.json`, plus an empty "Loots" section.
2. Every primitive in `components/ui` that comes from the registry matches the registry default.
3. No Loots value remains anywhere in `apps/web/src` (the new test passes).
4. Every page, dialog, toast and the code editor render in Geist or Geist Mono. Computed `font-family` checked in the browser on Overview, a dialog, a toast and the code editor.
5. No request to `fonts.googleapis.com`.
6. `pnpm test`, `pnpm check`, `pnpm build` pass, and every module is opened locally and still works: Profile (formerly Resume), Skills, Engineering, Terms, Project Memory.
7. The owner has looked at the hosted app. A local build isn't proof of the hosted result.

## Open questions

- **Status colours:** the Badge-variant mapping in §3 drops green and amber entirely. If Solid versus Partly there needs colour back, that is the first build-on-top addition.
- **Design preview bundle:** keep with a preview-only font link (recommended), or pause.
