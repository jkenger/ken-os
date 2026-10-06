# Design System — product requirements

Status: first slice implemented locally; hosted verification and owner review pending. The current visual baseline remains `working` until the owner reviews the finished gallery. `/design-preview` is development-only.

## Purpose and boundary

Ken OS needs one durable, inspectable visual language that can guide this app and be intentionally reused in a new personal project. Today its decisions are spread across a development-only preview, Tailwind tokens, tailored shadcn components, and a portable skill. The Design System module is the owner-facing home for **approved** decisions and live examples. It is not a theme marketplace, a second component implementation, or a browser-based design editor.

The `/design-preview` route remains a development-only staging area for experiments. Nothing becomes a standard merely because it appears there. Promotion into the module is an explicit owner decision followed by an update to the implementation and portable guidance.

## Users and core jobs

The first user is the Ken OS owner. From the hosted app, they should be able to:

1. See the current visual baseline and know which choices are approved versus still exploratory.
2. Inspect real, interactive examples of the UI primitives and patterns used by Ken OS, including responsive and accessibility states.
3. Find the rule behind a choice—type, color, spacing, density, or component anatomy—without reading source files.
4. Export a self-contained design skill for use in a different personal project, without copying Ken OS-specific content or silently installing dependencies.

For an agent or developer working in this repository, the module must point to the actual tokens and components rather than encourage a parallel implementation.

## Existing decisions to carry forward

- One light system, the Evidence Workbench look adopted on 2026-10-06 (design system 0.2): cool greys with one indigo action colour; no additional colour presets in v1. Panels are white with a hairline and 5px radius. It replaced the earlier warm monochrome baseline.
- Inter for every role, with weight carrying hierarchy.
- Tailwind utilities for normal feature styling, CSS variables in `globals.css` for shared theme tokens, and tailored shadcn primitives in `components/ui`.
- A tinted 232px rail flush against the canvas with the modules and the current module's sections, and a 59px header with a breadcrumb.
- 44px indigo primary buttons with an arrow end icon, white secondary buttons, rails for ordered levels, and capability-style tables that open into tinted detail.
- A design skill is an optional preset for personal work, not a mandate for every future project or client app.

The current values and anatomy are recorded in [component language](../design/component-language.md) and the existing [portable skill](../../.agents/skills/ken-os-design/SKILL.md). They are a working baseline, not a claim that every state has been visually approved.

## V1 scope

### 1. Hosted module

Add an owner-only `Design System` destination in the Ken OS workspace. Its navigation should be task-oriented: Overview, Foundations, Components, Patterns, and Export may be sections of one page initially; separate routes are unnecessary until content warrants them. The module must work on desktop and mobile and follow the existing app shell.

### 2. Foundations

Show semantic color tokens with names, values, and their intended uses; the display/body type roles and scale; spacing and density guidance; border/radius rules; and app-shell composition. Show actual rendered samples, not only a palette table. Label provisional rules as provisional rather than making them look approved.

### 3. Component gallery

Start with the frequently reused pieces: primary/secondary/quiet buttons, separated end icon, stock Card, feature panel, input, status text, and navigation/section treatment. Render the **same shared components** used by the app. For each, show purpose, anatomy, size/density rules, and relevant hover, focus, disabled, loading, error, and long-content states where applicable. A gallery example must not imply a state exists in the component API if it does not.

### 4. Applied patterns and decisions

Use Resume hub, Skills, and the Project Memory mockup as examples of how the system behaves at different densities. Distinguish shipped screens from development-only mockups. Record a short decision log for meaningful choices: what was selected, why, what was rejected, status, and when it changed. A Git-backed changelog or versioned content is sufficient for v1; no database workflow is required.

### 5. Portable export

Offer a self-contained `ken-os-design` ZIP bundle: `SKILL.md` plus Markdown references. A working version may be downloaded for testing, but the module, filename, and bundle must clearly say it is **not yet approved**. The export should describe transferable design rules and adaptation checks, not copy branding, sample data, credentials, or app-only links. It must state that explicit user choices and a target repo's existing system take precedence. Reuse the Skills library's safe Markdown/ZIP conventions where possible, but **do not** auto-enable this skill for the resume agent or install it globally. The exported version and the module's displayed version must match. A separately downloaded `SKILL.md` that links to references is **not** a complete installable bundle; a copy/paste option should inline essential rules or clearly tell the user to take the references too.

## Out of scope for v1

- Multiple themes/presets, dark mode, accent-color picker, or arbitrary token editing in the browser.
- Figma synchronization, generated code packages, npm publication, or automatic installation into other repositories.
- A second component library, new agent runtime, database tables, or agent permissions.
- Automatic promotion of preview experiments to standards.
- Exhaustive documentation of every shadcn component before Ken OS uses it.

## Source-of-truth rule

The app's shared components and CSS tokens own rendering. Versioned design content owns the human-readable rationale and portable rules; the hosted module and export must derive from the **same versioned content**, not two independently edited copies. The exact file layout/generation mechanism is an implementation decision, but a change that alters an approved token or component must update its example and portable guidance in the same review. `/design-preview` never serves as the authoritative source.

## Acceptance criteria

1. A signed-in owner can open the hosted module; an unauthenticated visitor cannot see it or download its export.
2. Token names/values and live component examples match the shipped code. No duplicate demo-only component masquerades as the production primitive.
3. The module visibly separates approved baseline, working proposals, and development-only examples.
4. Buttons and cards have documented usage and realistic interactive/responsive states; keyboard focus and text contrast remain usable.
5. The export contains only supported Markdown files, passes the existing skill bundle validator, and can be imported back without losing its instructions/references.
6. The displayed version, decision log, and downloaded bundle agree. A changed approved rule cannot silently leave an old export behind.
7. At least one desktop and one mobile viewport are visually checked against the selected working baseline; no hidden horizontal overflow or cut-off primary controls.
8. A working ZIP is downloadable for trial use and visibly labeled unapproved in the module and its contents; downloading it does not promote the standard.

## Settled v1 decisions

1. The current baseline is `working`, not `approved v1`. The first approved release follows owner review of the finished module gallery.
2. A ZIP containing `SKILL.md` and its Markdown references is the canonical installable export. A copy/paste option may follow only if it includes the essential rules in one self-contained document; a lone `SKILL.md` with unresolved reference links is not presented as a complete export.
3. A concise Git-backed decision log is sufficient for the pilot. The hosted module reads versioned content; it does not need database-backed approvals or browser editing in v1.
4. Working versions may be exported for trial use if their unapproved status is explicit throughout the flow. Owner review—not a download—promotes the first approved release.

## Delivery sequence

1. Label the existing baseline accurately and establish one versioned content contract.
2. Reconcile the current skill/docs with that contract.
3. Build the owner-only module using the existing app shell and real primitives.
4. Add the ZIP export and round-trip validation.
5. Verify behavior, visual density, responsive layouts, and hosted access after deployment; then request owner review for `approved v1`.
