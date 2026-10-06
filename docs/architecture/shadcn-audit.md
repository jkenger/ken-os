# shadcn/ui audit

Audited and fixed on 2026-10-06 on branch `refactor/shadcn-audit`.

**Answer:** screens were not using shadcn. Ken OS had shadcn installed but only ever pulled three of its components, and no rule, tool or test said screens had to use them. Every page now builds its controls from shadcn primitives in `apps/web/src/components/ui`, and a test fails if that slips again.

## What the audit found

Before the fix, outside `components/ui`:

| Hand-built thing | Where | shadcn component it duplicated |
|---|---|---|
| 63 raw `<button>`s, plus 61 uses of the `primaryButton` / `secondaryButton` / `textButton` class strings | 19 files, mostly Engineering | Button |
| 9 raw `<input>`, 27 `<textarea>`, 6 `<select>`, 48 `<label>` | 15 files | Input, Textarea, NativeSelect, Label, InputGroup |
| A modal with its own focus trap and Escape handling | Engineering `flow.tsx`, Writing Studio preview | Dialog |
| `role="tab"` button rows | Profile panes, lab panels, course tracks | Tabs |
| `role="switch"` button | Course preview | Switch |
| `aria-pressed` button rows | Learn scope filter, confidence 1 to 5 (twice) | ToggleGroup |
| The app shell: its own sidebar cookie, Ctrl+B, focus trap and phone overlay | `workspace-shell.tsx` | Sidebar, Sheet |
| Module search with its own overlay and focus trap | `workspace-shell.tsx` | Command (CommandDialog) |
| Notifications with their own queue and timers | `ui/toaster.tsx` | Sonner |
| Status labels | `ui/pill.tsx`, Engineering `kit.tsx` | Badge |
| 5 raw tables | 4 files: lesson Markdown, level table, previews | Table |

Only `button`, `card` and `input` existed as primitives before 2026-10-03, and `tooltip` was copied in by hand. The other files in `components/ui` (`pill`, `timeline`, `toaster`, `disclosure-summary`, `code-editor`) were written from scratch.

## Why it happened

All three causes below were needed for it to go this far. The first is the main one.

### 1. The rule said where primitives live, not that screens must use them

`AGENTS.md` said "shadcn/ui primitives live in `apps/web/src/components/ui` and should be tailored". It never said: use one for every control, and add the missing one from the registry before writing markup. So an agent building a tab row found no `tabs.tsx`, and writing a `<button role="tab">` was within the rules.

The first version (2026-09-23) also said "the original Ken OS CSS remains in place", which made hand-written markup the normal path from day one.

### 2. When the design contract changed, the Button didn't

The Studio redesign (`ee3481b`, 2026-10-06) set buttons to 44px with a medium-weight label. The shadcn `Button` stayed at 40px semibold. The prototype port (`773a9bf`, "the prototype's look one to one") needed the new look, so it added class strings in `kit.tsx` and put them on raw `<button>` and `<Link>` elements. From then on, Engineering had a second button system.

The app shell went the same way (`7ad820e`): it copied "shadcn's sidebar anatomy" by hand instead of installing the `Sidebar` component that already does all of it.

### 3. The ship skill only covered choosing the stack, and the MCP step came after the build

`ship-hosted-mvp` said "Tailwind CSS + shadcn/ui components, customized for the product". That is a stack choice at scaffold time. Nothing covered using the components while building screens.

The shadcn MCP server, which lets agents search and install registry components instead of guessing their source, was added to the skill on 2026-10-06 (`159cc9a`), after every page here was built. This repo never had it configured. The hand-copied tooltip ("copied unchanged") shows the cost: without the registry, agents copied code from memory.

Nothing checked any of this. App language had a scan test; shadcn use had none.

## What changed

- Added from the registry and tailored to the contract: textarea, label, native-select, input-group, dialog, sheet, tabs, switch, toggle, toggle-group, badge, collapsible, table, sidebar, separator, skeleton, command, sonner.
- `Button` now matches the contract (44px, medium label, `primary-hover`) and has a `text` variant, so `kit.tsx` no longer defines buttons.
- The shell runs on `SidebarProvider`, the nested icon sidebar and `SidebarInset`; module search is `CommandDialog`. Measured against the old shell at 1440px: same 49px rail, 208px section column and inset position. Under 1024px the column hides and section tabs show; under 768px the sidebar's own sheet holds both lists at 18rem.
- `toast()` keeps its signature and now shows through Sonner, pinned to the light theme (Ken OS has no dark theme, so `next-themes` was removed).
- `Pill` and the Engineering page badge render shadcn `Badge` with status variants (`solid`, `partial`, `gap`, `neutral`, `dashed`).
- `.mcp.json` at the repo root runs the shadcn MCP server.
- `apps/web/src/lib/shadcn-primitives.test.ts` fails on any raw control (`button`, `input`, `select`, `textarea`, `option`, `label`, `table`, `dialog`), hand-built widget role or direct Radix import outside `components/ui`. It runs with `pnpm test`.
- `AGENTS.md`, `docs/architecture/starter-standard.md` and the `ship-hosted-mvp` skill now say to use or add the primitive first, and to tailor the primitive when the contract changes.

## Kept on purpose

| Thing | Why it stays |
|---|---|
| `<details>` with `DisclosureSummary` | Works without JavaScript, and find-in-page opens it. shadcn's Collapsible unmounts closed content. Already the project's chosen disclosure (2026-10-01). |
| Term lookup card (`role="dialog"`) | Non-modal card anchored to a text selection. Popover would take focus and close on the mouseup that makes the selection. Listed in the test's allow list. |
| `code-editor.tsx`, `timeline.tsx` | No shadcn equivalent; they live in `components/ui` and use shadcn tokens. |
| Section tabs in the shell header | They are page links with `aria-current`, not tab panels, so `Tabs` would be the wrong role. |

## Follow-ups

- Twelve Engineering files use `@tabler/icons-react` (from the prototype port), while `components.json` names Lucide. Pick one set; the rest of the app and every shadcn component use Lucide.
- shadcn's `Sidebar` has no hook for the gap width in its inset variant, so the shell uses the standard variant and styles `SidebarInset` directly. Revisit if shadcn adds one.
