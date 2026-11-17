# CV tailoring: mockup brief

Status: proposed, 17 Nov 2026. Draws the UI half of [cv-tailoring.md](../architecture/cv-tailoring.md) (technical
design) and [cv-tailoring.md](../product/cv-tailoring.md) (product spec). This brief says which frames, states
and words to draw. Code follows the chosen mockups.

This is not a new screen: it's new states of one existing button on the Job detail page
(`features/jobs/posting-detail.tsx`), already built and shipped. Draw only the title row that button sits in, not
the whole page.

## Handoff: what to return

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in
   Ground rules, plus the dark frame named. Do not export or render PNGs unless the owner asks.
2. **`cv-tailoring-mockups/README.md`** in project files, with:
   - **Frames**: a table of every frame id and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here, and
     why.
   - **Proposals**: any new token or component the frames needed (see "Adding a token or component" in
     `design-system.md`). Likely none — this reuses existing Button, Tooltip and toast components.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back.

Do not change code, `globals.css` or this brief. Changes go under "Changes from this brief"; the owner folds the
agreed ones in.

## Ground rules

- Loots as it is: shadcn's default setup plus the Loots tokens in `design-system.md`. Build from `components/ui`
  (Button, Tooltip, the `sonner`-based toaster) — the same primitives `posting-detail.tsx` already uses. Nothing
  new is expected; if a frame genuinely needs something, name it as a proposal.
  - For the pending spinner, reuse `LoaderCircle` with `animate-spin` (the pattern already used in
    `studio-inspector.tsx:676`), not a new spinner component.
- Words: app language — a verb and an object on every button, no sentences, no em dashes, no emoji. The existing
  button's copy, "Tailor my CV", is shipped and unchanged; only the states after it are new.
- Sizes: desktop at 1440, phone at 390. Light theme, plus the one dark frame named below.
- Real data: the title row as it already renders for a real posting — company avatar, posted/updated timestamps,
  "Save to board" (disabled, out of scope), the title, then this button pair, then Apply. Use any real posting
  already in the Job board for the surrounding chrome; don't invent one.

## Layout

```text
┌ Company  Avatar  Name ─────────────────────────────── Posted 3d ago · Updated 1d ago ┐
│                                                                          [Save to board]│
│  Senior Backend Engineer                              [Tailor my CV]  [Apply ↗]        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

The button pair (`Tailor my CV` / `Apply`) is the only thing changing. Everything else in the row is already
built; draw it for context, annotate that it's unchanged.

## Frames

| Frame | State                                                                                                                                                                              | Copy                                                                                                          |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| A1    | No tailored resume yet. Button enabled (today it's drawn `disabled`); same outline style, `FileText` icon                                                                          | "Tailor my CV"                                                                                                |
| A2    | Pending: clicked, waiting on the AI call. Button disabled, icon replaced by a spinner                                                                                              | "Tailor my CV" (label unchanged, only the icon spins)                                                         |
| A3    | Success: a tailored resume exists. Two controls side by side — the main button now opens the PDF in a new tab; a small icon-only ghost button beside it re-runs it                 | Main button "View tailored CV" with an external-link icon; icon button tooltip "Regenerate", `RefreshCw` icon |
| A4    | Regenerating: A3's pair, but the icon-only button shows the spinner and both are disabled until it resolves                                                                        | Same labels, spinner on the icon button                                                                       |
| A5    | Error: the AI call failed. The button pair returns to A1 (or A3, if a tailored resume already existed from before) so the owner can retry immediately; a toast reports the failure | Toast, error tone: "Couldn't generate — try again"                                                            |
| A6    | Dark frame of A3 (the steady state most often seen)                                                                                                                                | Same                                                                                                          |
| A7    | Phone at 390 of A1 and A3 — confirm whether the button pair stays inline or wraps under the title given the existing `flex-wrap` on this row                                       | Same                                                                                                          |

## Behaviour to show or annotate

- A5 is reachable from either A1 (first attempt fails) or A3 (regenerate fails) — draw the toast once; note both
  entry points rather than duplicating the frame.
- Regenerate (A3→A4) overwrites the existing tailored resume; there is no version history and no confirm dialog
  before it (spec: "Clicking Tailor resume again on a posting that already has one overwrites it").
- Keyboard: both buttons are normal Tab stops; the icon-only Regenerate button needs its `aria-label`/Tooltip for
  screen readers since it carries no visible text.
- Status is never colour alone: the pending/regenerating state is shown by the spinner replacing the icon, not by
  a colour change.

## Explicitly out of scope here

- Where the AI's `whyFits`/selection reasoning might be shown to the owner — not asked for; the spec only asks for
  the resume itself.
- Cover letters and the ATS/keyword check (product spec, "What this is not (yet)").
