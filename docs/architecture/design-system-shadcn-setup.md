# Design system setup on the shadcn standard

Status: proposed, 10 Oct 2026. Not yet implemented. Written for a separate implementation session.

## Decision

Ken OS's styling setup is rebuilt on the standard shadcn/ui setup for a Next.js app (shadcn 4, Tailwind CSS v4, `next/font`). The Ken OS design system is then applied on top of that standard rather than beside it.

Three layers, each in its own place:

| Layer | What it is | Where it lives |
|---|---|---|
| **1. Base** | Exactly what `shadcn init` produces for Next.js: file layout, token names, Tailwind wiring, font loading, base styles | `components.json`, `globals.css` structure, `layout.tsx`, `lib/utils.ts` |
| **2. Adapt** | Ken OS values poured into shadcn's token names: colours, fonts, radius | Generated from the design system into `design-tokens.generated.css` and `fonts.generated.ts` |
| **3. Build on top** | Everything Ken OS adds that shadcn doesn't have: extra colours, status colours, shadows, sizes, utilities, tailored components | A separate "Ken OS extensions" block in the generated CSS, plus `globals.css` utilities and `components/ui` |

The rule that follows: **a shadcn token name always means what shadcn means by it**, so any shadcn component or registry item works unchanged. Ken OS-only ideas get Ken OS names in layer 3.

The design system on claude.ai stays the source of truth for values. `tokens.json` stays a word-for-word copy. Only the generator and the files around it change.

## Why

A question about fonts showed the setup has drifted from the standard:

- Fonts load through a Google Fonts `@import` instead of `next/font`, so they aren't self-hosted, preloaded or size-adjusted, and they cost a request to Google on every visit.
- Toasts ignore the app font. Sonner sets its own system font on the toaster, and nothing resets it.
- There's no mono font token. Code text falls back to Tailwind's default, and the code editor hardcodes its own stack.
- Ken OS uses `font-display` and `--font-body` where shadcn 4 uses `font-heading` and `--font-sans`. shadcn's CLI reads `--font-sans`, `--font-heading` and `--font-mono` when it adds fonts and components, so the current names fall outside what it understands.
- Ken OS colours, extensions and shadcn's own tokens sit in one unlabelled `:root` block, so it isn't clear which tokens a shadcn component relies on.

## 1. Where things stand today

| Piece | shadcn standard | Ken OS today | Change |
|---|---|---|---|
| `components.json` | style, `cssVariables: true`, aliases, icon library | `radix-nova`, neutral, lucide, aliases set | Keep as is |
| CSS imports | `tailwindcss`, `tw-animate-css`, `shadcn/tailwind.css` | Same, plus a Google Fonts `@import` first | Remove the Google Fonts `@import` |
| Font loading | `next/font` in `layout.tsx`, variable on `<html>` | Google Fonts `@import`, no `next/font` | Switch to `next/font` (§3) |
| Font tokens | `--font-sans`, `--font-heading`, `--font-mono` | `--font-body`, `--font-heading`, no mono | Rename to the shadcn names (§3) |
| Font classes | `font-sans`, `font-heading`, `font-mono` | `font-sans`, `font-display` (12 files), `font-mono` with no token | `font-display` becomes `font-heading` |
| Colour tokens | shadcn's set in `:root`, `.dark` overrides | shadcn's set plus 16 Ken OS colours and the size, spacing, radius and shadow tokens, light only | Split into shadcn block and extensions block (§2) |
| Chart tokens | `--chart-1` to `--chart-5` | Missing | Add when the design system defines them (§2) |
| Radius | `--radius` base, `--radius-sm` to `--radius-xl` derived from it | Named radii (item, menu, tab, panel) mapped onto sm to xl; no `--radius` | Add `--radius`, keep the named mapping (§4) |
| Base layer | `* { border-border outline-ring/50 }`, `body { bg-background text-foreground }`, `html { font-sans }` | Similar, plus headings, focus outline, scrollbars | Restructure to the standard order, keep additions in layer 3 (§5) |
| Dark mode | `.dark` block, `@custom-variant dark` | Variant declared, no `.dark` values | Leave as is; Ken OS is light only (§6) |
| Toasts | shadcn `sonner.tsx` | Tailored, but leaks the system font | Fix in the tailored component (§5) |

## 2. Colour tokens

The generator writes two blocks in `design-tokens.generated.css`, in this order:

```css
/* shadcn tokens: values from the Ken OS design system. */
:root { --radius: …; --background: …; … }

/* Ken OS extensions: tokens shadcn doesn't define. */
:root { --canvas: …; --signal: …; … }
```

### Block 1: shadcn tokens

Every token below must exist, named exactly as shadcn names it. The value comes from the design system token of the same name.

`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, `--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`, `--radius`.

`--chart-1` to `--chart-5` join this block only when the design system defines them. Until then, no chart component is added.

### Block 2: Ken OS extensions

`--canvas`, `--quiet`, `--signal`, `--primary-hover`, `--tint`, `--table-head`, `--row-hover`, `--rail`, `--rail-lit`, `--rail-soft`, `--status-solid`, `--status-solid-surface`, `--status-partial`, `--status-partial-surface`, `--status-gap`, `--status-gap-surface`, plus the spacing, size, named radius and shadow tokens.

### How the generator knows which block a token goes in

A fixed list of shadcn names lives in the generator (`SHADCN_TOKENS` in `src/lib/design-tokens.ts`). Any design system token on that list goes in block 1; anything else goes in block 2. A shadcn name missing from the design system fails generation with the missing name, so the design system has to fill it.

Colour values stay in the format the design system writes them (hex today). shadcn's oklch values are a default, not a requirement.

### Tailwind mapping

`globals.css` keeps one `@theme inline` block, in two labelled groups that mirror the two CSS blocks:

1. **shadcn's standard mapping:** `--color-background: var(--background)` and so on, exactly as `shadcn init` writes it.
2. **Ken OS extensions:** `--color-canvas`, `--color-signal`, `--color-status-*` and the rest.

## 3. Fonts

### Target setup (the shadcn 4 standard)

- `layout.tsx` loads every family with `next/font/google`, each exposing a CSS variable: `--font-sans`, `--font-heading`, `--font-mono`.
- The variables go on `<html>` together with `font-sans`, so every layer inherits the body font, portals included.
- `globals.css` maps them for Tailwind:
  ```css
  @theme inline {
    --font-sans: var(--font-sans);
    --font-heading: var(--font-heading);
    --font-mono: var(--font-mono);
  }
  ```
- Base styles: `html { @apply font-sans; }`, and `h1, h2, h3 { @apply font-heading; }` as a Ken OS addition.

### Keeping the design system in charge

`next/font` needs literal function calls at build time, so the font names can't be read from CSS. The generator therefore writes a second file, **`src/app/fonts.generated.ts`**, from `tokens.json`:

```ts
// Generated from design-system/tokens.json. Do not edit.
import { Bricolage_Grotesque, JetBrains_Mono, Public_Sans } from "next/font/google";

export const fontSans = Public_Sans({ subsets: ["latin"], display: "swap", variable: "--font-sans" });
export const fontHeading = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", axes: ["opsz"], variable: "--font-heading" });
export const fontMono = JetBrains_Mono({ subsets: ["latin"], display: "swap", variable: "--font-mono" });
```

`layout.tsx` imports these three and applies their `.variable` classes. A family change in the design system then reaches the app through the normal sync: pull, `design:generate`, PR.

The mono family above is an example. The real one comes from the design system (see §7).

Rules for the generated font module:

- The family name in `tokens.json` must be a Google Fonts family. The generator turns it into the `next/font/google` import name (spaces become underscores) and fails if the design system names a family Google doesn't serve.
- Use a variable font and no `weight` when one exists. Add `axes` only where the design system asks for an optical-size or similar axis.
- The fallback part of the design system's stack (`Arial, sans-serif`) goes into the call's `fallback` option.
- `design-tokens.generated.css` no longer writes `--font-*` variables; `next/font` owns them.

### Renames in the app

| Today | After |
|---|---|
| `--font-body` | `--font-sans` |
| `--font-heading` (from the CSS) | `--font-heading` (from `next/font`) |
| `font-display` class (12 files) | `font-heading` |
| No mono token | `--font-mono`, class `font-mono` |
| Code editor inline `fontFamily` ([code-editor.tsx:13](../../apps/web/src/components/ui/code-editor.tsx)) | `var(--font-mono)` |

### Places that escape inheritance

- **Toasts:** Sonner puts its own `font-family` on `[data-sonner-toaster]`. The tailored [sonner.tsx](../../apps/web/src/components/ui/sonner.tsx) sets `fontFamily: "var(--font-sans)"` in its `style` prop, with a one-line comment saying why.
- **Code editor:** uses `--font-mono`, as above.
- **Resume preview:** an iframe of Google's page; its fonts aren't the app's and stay that way.

## 4. Radius

shadcn derives its corner sizes from one `--radius`. Ken OS has four named radii chosen by the design system: item 6px, menu 8px, tab 10px, panel 14px.

- Keep the named radii as the source and keep mapping them onto Tailwind's sizes: `--radius-sm` → item, `--radius-md` → menu, `--radius-lg` → tab, `--radius-xl` → panel.
- Add `--radius` to block 1, set to the tab radius, so shadcn components and registry items that read `var(--radius)` directly get a Ken OS value.
- Don't use shadcn's `calc()` multipliers; they would replace the design system's chosen sizes with derived ones. This is a deliberate difference from the standard; record it in the file comment.

## 5. `globals.css` layout

Target order, with shadcn's standard parts first and Ken OS's additions labelled after them:

1. `@import "tailwindcss";`, `@import "tw-animate-css";`, `@import "shadcn/tailwind.css";`, `@import "./design-tokens.generated.css";`
2. `@custom-variant dark (&:is(.dark *));`
3. `@theme inline`: fonts, shadcn colour mapping, radius mapping, then a labelled "Ken OS extensions" group.
4. `@layer base`, the standard part: `* { @apply border-border outline-ring/50; }`, `body { @apply bg-background text-foreground; }`, `html { @apply font-sans; }`.
5. `@layer base`, the Ken OS part: headings use `font-heading`, `font-synthesis: none`, `scroll-smooth`, the focus outline rule, and thin scrollbars.
6. Ken OS utilities: `shadow-panel`, `shadow-tab`, and `shadow-overlay` if it's in use.

Nothing in `globals.css` holds a raw value; values come from the generated files.

## 6. Dark mode

Ken OS is light only, by design system decision. Keep the `dark` variant so shadcn components compile unchanged, and write no `.dark` block. If the design system adds a dark theme later, the generator writes it as `.dark { … }` using the same two-block split.

## 7. Changes needed in the design system first

These happen in the Ken OS design system on claude.ai, then come into the repo through the `design-system-sync` skill:

1. **A mono family.** Add `type.families.mono` with a Google Fonts monospace family. This is a look decision for the owner; nothing in the repo picks it.
2. **Family names map to shadcn's.** Either rename `type.families.body` to `sans`, or keep `body` and let the generator map `body → sans`. Recommended: keep `body` and map it, so the design system stays in its own words.
3. **`--radius`.** Either add a `radius` token or let the generator set it from `radius-tab`. Recommended: let the generator set it; no design system change.
4. **Optional axes.** If Bricolage Grotesque's optical size should stay on, say so in the family entry (today the CSS import asks for `opsz`). Recommended: keep `opsz` on.

## 8. What changes in the repo

| File | Change |
|---|---|
| `apps/web/src/lib/design-tokens.ts` | Two-block CSS output; `SHADCN_TOKENS` list; generator fails on a missing shadcn token; `--radius` from the tab radius; no `--font-*` in CSS; new `fontModule()` that writes the font file |
| `apps/web/scripts/generate-design-tokens.ts` | Writes and checks both `design-tokens.generated.css` and `fonts.generated.ts` |
| `apps/web/src/app/fonts.generated.ts` | New, generated |
| `apps/web/src/app/layout.tsx` | Imports the three fonts; `<html className={cn(fontSans.variable, fontHeading.variable, fontMono.variable, "font-sans")}>` |
| `apps/web/src/app/globals.css` | Reordered as §5; Google Fonts `@import` removed; font mapping renamed; `--radius` mapped |
| 12 files using `font-display` | `font-heading` |
| `apps/web/src/components/ui/sonner.tsx` | Body font on the toaster |
| `apps/web/src/components/ui/code-editor.tsx` | `var(--font-mono)` |
| `apps/web/src/lib/design-tokens.test.ts` | New tests: every name in `SHADCN_TOKENS` is in the generated CSS; the font module names the same families as `tokens.json`; no `font-display` class anywhere in `src` |
| `.agents/skills/design-system-sync/SKILL.md` | Step 4 regenerates both files; step 5 explains the two blocks and that a new font family arrives through `fonts.generated.ts` |
| `AGENTS.md` | The design-system bullet names both generated files and this document |
| `apps/web/design-system/components.ts` and `design:bundle` | Check the preview bundle still gets fonts: previews run outside Next, so `next/font` doesn't reach them. The bundle's CSS needs the families declared directly (`@font-face` or a Google Fonts link inside the preview only) |

`tokens.json` doesn't change in the repo except through a sync.

## 9. Slices

| # | Branch | Covers |
|---|---|---|
| 0 | (owner, in the design system) | §7: mono family, any family or axis decisions; then a sync PR |
| 1 | `refactor/design-tokens-shadcn-blocks` | Generator split into shadcn and extension blocks, `SHADCN_TOKENS`, `--radius`, `globals.css` reorder, tests |
| 2 | `refactor/next-font` | `fonts.generated.ts`, `layout.tsx`, remove the `@import`, rename `font-display` → `font-heading`, mono token, Sonner and code editor fixes, design preview bundle fonts |
| 3 | `docs/design-system-shadcn-setup-done` | Sync skill and `AGENTS.md` updates; this file's status to Implemented |

Slice 2 can run before slice 0 lands. It then generates sans and heading only, and the mono step follows the sync.

## 10. Done when

1. `shadcn add <any component>` drops in and renders in Ken OS's look with no edits to tokens.
2. Every page, dialog, toast and popover renders body text in the design system's body family. Computed `font-family` checked in the browser on Overview, a dialog, a toast and the code editor.
3. No request to `fonts.googleapis.com` from the app; fonts are served from the app's own origin.
4. `pnpm test`, `pnpm check` and `pnpm build` pass; `design:generate --check` passes for both generated files.
5. A family change in the design system reaches the app through one sync PR, without hand-editing `layout.tsx` or `globals.css`.
6. The design system's live previews still show the right fonts.

## Open questions

- **Mono family:** which one? It's the owner's pick in the design system.
- **Previews:** load fonts in the preview bundle with `@font-face` files from the app build, or a Google Fonts link inside the preview only? Recommended: the Google Fonts link, since previews are owner-only and outside the app.
