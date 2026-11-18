# Job listing card: mockup brief

Status: proposed, 18 Nov 2026. Draws the UI for restyling the New-list card's match score, adding an ATS
compatibility badge beside it (`docs/product/job-finder.md`, "ATS compatibility"), and adding Tailor/Write cover
letter quick actions to the card's footer, reusing the AI tailoring and cover-letter capabilities already built
(`docs/architecture/cv-tailoring.md`, `docs/architecture/cover-letter.md`). This brief says which frames, states
and words to draw, and proposes a card reorganization for review. Code follows the chosen mockups.

## Decided in discovery (18 Nov 2026)

- **Modal, not redirect.** Tailor/Write cover letter on the card open a modal, not a navigation to `/jobs/[id]`
  — the card's job is scanning a list; losing scroll position to glance at a cover letter is disproportionate.
- **Same state, second entry point.** The modal reuses the exact same hooks (`use-tailor-flow.tsx`,
  `use-cover-letter-flow.tsx`) and the exact same content the detail page's title row/Cover letter tab already
  show — not a second implementation. The detail page's own UI is untouched.
- **Pending shows inline on the card.** Clicking an idle action spins that button in place on the card (list
  stays scrollable); the modal opens on click once/after it's ready, not automatically when generation finishes.
- **Score: bigger/bolder only.** No new color semantics on the match score.
- **ATS: a second compact badge beside the score**, not merged into one display. Plain formula, no AI call — see
  the product spec.
- **Company Match Score: dropped.** Not in scope for this round.

## Handoff: what to return

1. **The design canvas link**: one canvas with an artboard per frame, named by its frame id, at the widths in
   Ground rules, plus the dark frame named. Do not export or render PNGs unless the owner asks.
2. **`job-card-actions-canvas/README.md`** in project files, with:
   - **Frames**: a table of every frame id and Done, Changed or Skipped.
   - **Changes from this brief**: each place the copy, layout or behaviour differs from what is written here,
     and why.
   - **Proposals**: any new token or component the frames needed.
   - **The reorganization recommendation**: confirm or revise E9 below (does the whole card need a different
     structure, or do the new pieces slot into the existing one) — this is the open question this brief most
     needs an answer to.
   - **Open questions**: decisions the owner has to make before code starts, each with the option you recommend.
3. **A short summary** in the reply that hands the work back.

Do not change code, `globals.css` or this brief. Changes go under "Changes from this brief"; the owner folds the
agreed ones in.

## Ground rules

- Loots as it is: shadcn's default setup plus the Loots tokens in `design-system.md`. Build from `components/ui`
  (Badge, Button, Dialog, ButtonGroup, Textarea, the `sonner` toaster) and the `rainbow-ring` treatment already
  used by Tailor my CV and Write cover letter on the detail page (`apps/web/src/app/globals.css`,
  `apps/web/DESIGN.md`'s owner-approved exception) — reuse it here too, don't invent a new decorative style for
  the card versions of these same actions.
- Words: app language — a verb and an object on every button, no sentences, no em dashes, no emoji.
- Sizes: desktop at 1440 (card at its real list width, not full-bleed), phone at 390. Light theme, plus one dark
  frame.
- Real data: use a real posting already on the Job board (one with skills, pay, and a score) for every frame's
  content; don't invent one. Show at least one frame with a long title/company name to prove the layout doesn't
  break on overflow.

## Current card, for reference

`apps/web/src/features/jobs/new-list.tsx`, `PostingCard`: avatar, title + status badge (New/Saved/Applied),
company name, score badge + Save button (top-right), a meta row (work setup, country, job type, seniority,
posted), a 2-line snippet, skill badges, pay range, a separator, then the footer with a lone Apply button
(bottom-right).

## Frames

| Frame | State                                                                                                                                                                                                                                                                                       | Copy                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| E1    | Baseline: restyled score + new ATS badge, footer gains Tailor and Write cover letter beside Apply, neither generated yet                                                                                                                                                                    | "92 match", "ATS 85%", "Tailor", "Write cover letter", "Apply"                          |
| E2    | Score + ATS badges in isolation, large, both number treatments visible to compare                                                                                                                                                                                                           | Same                                                                                    |
| E3    | Tailor pending: spinner inline on the card's Tailor button, rest of the card unaffected                                                                                                                                                                                                     | "Tailor"                                                                                |
| E4    | Tailor ready: button's label/icon changes to reflect a tailored CV exists                                                                                                                                                                                                                   | "View tailored CV" or similar, shorter than the detail page's version to fit card width |
| E5    | Write cover letter pending                                                                                                                                                                                                                                                                  | "Write cover letter"                                                                    |
| E6    | Write cover letter ready                                                                                                                                                                                                                                                                    | "View cover letter"                                                                     |
| E7    | Tailor modal open: same content as the detail page's ready state (view PDF link, Regenerate) in a `Dialog`                                                                                                                                                                                  | Dialog title names the posting                                                          |
| E8    | Cover letter modal open: same content as the detail page's tab (Textarea, status line, Copy letter/Regenerate/Save) in a `Dialog`                                                                                                                                                           | Same                                                                                    |
| E9    | **Reorganization proposal**: the whole card with every piece present — annotate whether the footer's three actions (Tailor, Write cover letter, Apply) need visual grouping (e.g. two secondary actions clustered left, Apply alone right as the primary one) or a different split entirely | —                                                                                       |
| E10   | Phone width (390) of E1 and E9 — confirm whether the footer wraps or the secondary actions collapse into something smaller (icon-only?)                                                                                                                                                     | Same                                                                                    |
| E11   | Dark frame of E1                                                                                                                                                                                                                                                                            | Same                                                                                    |

## Behaviour to show or annotate

- E3→E4 and E5→E6 each only ever reachable from their own idle state — a card never shows both idle and ready at
  once.
- Regenerate from the modal (E7/E8) behaves exactly as it does today on the detail page (overwrite silently for
  Tailor; the edited-confirm dialog for Cover letter) — not redrawn here, just confirm the modal doesn't need a
  narrower/different version of that behavior to fit.
- Status is never color alone: the ATS/score badges carry their numbers as the signal, same as every other Jobs
  badge.
- Clicking anywhere else on the card still opens the detail page, same as today — Tailor/Write cover
  letter/Apply/Save all need `stopPropagation` or equivalent so they don't also navigate.
- Keyboard: every new control is a normal Tab stop; the modal traps focus and Escape closes it (shadcn `Dialog`
  default).

## Open questions

- **E9, the reorganization call**: does slotting three footer actions in plus a second badge actually break the
  card's current density, or does it hold? This brief doesn't presuppose an answer — draw the baseline slot-in
  first (E1), then propose a restructure only if E1 genuinely looks crowded once drawn with real content.
- Exact ATS badge wording ("ATS 85%" vs "85% ATS match" vs something shorter) — propose options against real
  card width.
- Whether Tailor/Write cover letter need their own distinct icons on the card (matching `FileText`/`Mail` from
  the detail page) or read as text-only given the card's tighter horizontal space.

## Explicitly out of scope here

Company Match Score (product spec, "Dropped for now"). Any change to the detail page's own title row or Cover
letter tab — those stay exactly as shipped.
