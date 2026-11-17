# Cover letter: mockup brief

Status: drawn and reviewed, 17 Nov 2026 (see "Decided" below: the new page became a tab). Was: proposed, 17 Nov 2026. Draws the UI half of [cover-letter.md](../architecture/cover-letter.md)
(technical design) and [cover-letter.md](../product/cover-letter.md) (product spec). This brief says which
frames, states and words to draw. Code follows the chosen mockups.

Two surfaces change: one new button on the existing Job detail title row (same row CV tailoring's own brief
already covers), and a brand-new page at `/jobs/[id]/cover-letter` (superseded: a Cover letter tab on Job
detail, see "Decided").

## Handoff: what to return

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in
   Ground rules, plus the dark frame named. Do not export or render PNGs unless the owner asks.
2. **`cover-letter-canvas/README.md`** in project files, with:
   - **Frames**: a table of every frame id and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here,
     and why.
   - **Proposals**: any new token or component the frames needed (see "Adding a token or component" in
     `design-system.md`). Likely none for the title row (reuses Button/Link exactly like "Tailor my CV"); the
     new page needs `Textarea` and `AlertDialog`, both already in `components/ui`.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back.

Do not change code, `globals.css` or this brief. Changes go under "Changes from this brief"; the owner folds the
agreed ones in.

## Ground rules

- Loots as it is: shadcn's default setup plus the Loots tokens in `design-system.md`. Build from `components/ui`
  (Button, Textarea, AlertDialog, the `sonner`-based toaster) — the same primitives the rest of Jobs already
  uses. Nothing new is expected; if a frame genuinely needs something, name it as a proposal.
  - For the pending spinner, reuse `LoaderCircle` with `animate-spin`, same as CV tailoring's own button.
- Words: app language — a verb and an object on every button, no sentences, no em dashes, no emoji. New copy
  needed: the "Write cover letter" button, the empty state's one line, the error line, the dialog's title/body.
- Sizes: desktop at 1440, phone at 390. Light theme, plus one dark frame.
- Real data: use any real posting already in the Job board for the title row's surrounding chrome and for the
  new page's title/company header; don't invent one. The letter's own body text can be a realistic placeholder
  (3-4 sentences) — don't wait on a real AI call to draw the frames.

## Frames: the title row (existing page)

Same row CV tailoring's brief already drew (`cv-tailoring.md`, frames A1-A7) — this adds one more button beside
"Tailor my CV" / "View tailored CV", unaffected by that button's own state.

```text
┌ Company  Avatar  Name ─────────────────────────────── Posted 3d ago · Updated 1d ago ┐
│                                                                          [Save to board]│
│  Senior Backend Engineer          [Tailor my CV] [Write cover letter] [Apply ↗]         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

| Frame | State                                                                                               | Copy                 |
| ----- | --------------------------------------------------------------------------------------------------- | -------------------- |
| C1    | No letter yet. Plain button, outline style, matching "Tailor my CV"'s weight (not the gradient one) | "Write cover letter" |
| C2    | A letter already exists for this posting. Label changes; still a plain `Link` to the same route     | "View cover letter"  |

No pending/error state drawn here — clicking either always just navigates to the new page, which owns every
other state itself (spec/design: "no inline pending/ready state in the panel itself").

## Frames: the new page, `/jobs/[id]/cover-letter`

A sibling to the posting detail page, not a modal, not inline in the panel.

| Frame | State                                                                                                                                                                                   | Copy                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| D1    | Empty: no letter yet for this posting. Posting title/company as a header (read-only context), one line, one action                                                                      | "Write a cover letter for this posting" / button "Write cover letter"                             |
| D2    | Generating: D1's button disabled, spinner replacing its icon                                                                                                                            | Same label, spinner                                                                               |
| D3    | Has a letter, unedited: editable `Textarea` filled with the letter, "Save" disabled (nothing to save yet), "Regenerate" enabled                                                         | Buttons "Save", "Regenerate"                                                                      |
| D4    | Has a letter, edited: same as D3 but the owner has typed something different from what loaded — "Save" becomes enabled                                                                  | Same                                                                                              |
| D5    | Regenerate clicked while edited (D4's state): confirm dialog over the page                                                                                                              | Dialog title "This replaces your edited letter", body one line, buttons "Cancel" / "Yes, rewrite" |
| D6    | Regenerating: D3/D4's "Regenerate" button shows the spinner, both buttons disabled until it resolves                                                                                    | Same labels, spinner                                                                              |
| D7    | Error, first generation only (reachable from D1, never from D3/D4): AI failure, number check failure, or nothing to write from (empty `whyFits`) — all three read the same to the owner | "Couldn't write a letter for this posting", one retry action in the same empty-state shape as D1  |
| D8    | Dark frame of D3 (the steady state most often seen)                                                                                                                                     | Same                                                                                              |
| D9    | Phone at 390 of D1 and D3                                                                                                                                                               | Same                                                                                              |

## Behaviour to show or annotate

- D4→D5→(Yes, rewrite)→D6 is the only path that shows the dialog. Clicking "Regenerate" from D3 (never edited, or
  already saved back to exactly the generated text) skips straight to D6 — no dialog when there's nothing of the
  owner's to lose.
- "Save" (D4) always calls the PUT route directly, no confirmation — the owner is explicitly choosing to keep
  their own edit; there's nothing to warn about there, only on the AI-overwrite path.
- A failed Regenerate (D3/D4) never reaches D7 and never discards the textarea — same "never make an existing
  result look like it's gone" rule CV tailoring's own A5 frame follows. The letter stays exactly as it was,
  both buttons return to enabled, and a toast reports the failure (error tone, "Couldn't write a letter. Try
  again"). D7's full-page error state is reachable only from D1, the true first-ever-failure case with nothing
  to protect.
- Status is never colour alone: pending/regenerating is the spinner replacing an icon, not a colour change.
- Keyboard: `Textarea`, "Save" and "Regenerate" are normal Tab stops; the dialog traps focus and Escape closes it
  (shadcn `AlertDialog` default).

## Open questions

None left; see "Decided".

## Decided

From the owner's review of the canvas (`docs/mockups/cover-letter-canvas/`, 17 Nov 2026):

- **A tab, not a page**: the letter lives in a third Job detail tab, Cover letter, beside Description and Company.
  No `/jobs/[id]/cover-letter` route. The title row button switches to that tab.
- **Empty and error states** span the tab's full width, content centred: Mail (muted) for the empty state,
  CircleAlert (destructive) for the error, each beside its line. The error's retry is the same "Write cover
  letter" button.
- **Phone title row** wraps its action group.
- **Status line** reads "Edited" for an edited letter, "Written <date>" otherwise.
- **Copy letter** sits before Regenerate and Save, with a "Letter copied" toast.
- **Dialog copy** follows the app's confirmation pattern: "Rewrite this letter?" / "Your edits are replaced by a
  new letter" / Cancel, Rewrite letter.
- **Default tab** is always Description; unsaved edits survive switching tabs while the page is open.

## Explicitly out of scope here

PDF export, multi-letter history, tone presets — same as the product spec's own "What this is not (yet)."
