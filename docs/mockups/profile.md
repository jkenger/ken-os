# Profile: design directions

Status: decided, 24 Oct 2026. The owner picked **A. Ledger**; it is built on Profile (screenshots in
[`docs/design/profile-ledger/`](../design/profile-ledger/)). The Autofill panel comes with the resume Autofill work. Spec:
[profile-resume.md](../product/profile-resume.md) for the stored profile, Autofill and the public link; the public
resume itself now lives in the Portfolio module ([portfolio.md](../architecture/portfolio.md)).

Prototypes and screenshots: [`docs/design/profile-directions/`](../design/profile-directions/). Open
`index.html` there, or any of the three pages. Add `?theme=catalog` or `?theme=catalog-dark` to see a page in the Course
catalog look from PR #143. Private link with all three: https://claude.ai/artifact/X4xK3v8BiugW98rHTmAFsa

## What every direction draws

- **Resumes:** several stored files, newest first, added only by Upload. Uploading again adds another; nothing is
  replaced. Each file shows its
  date, page count and state (In review, Applied Oct 14, Not used) and has its own Autofill button.
- **Autofill review:** a field-by-field diff between the saved profile and one resume. Each change is accepted or left
  out on its own; nothing is saved until "Accept 4 changes". Matching fields are folded away.
- **Public link:** the Portfolio's resume, with its state (Live), version and date, and how many sections changed since
  it was published. Copy link and Open Portfolio. Publishing stays in Portfolio.
- **Engineering:** the one-line roadmap summary that Profile shows today.

## Directions

| Direction                                                 | Layout                                                                                           | Autofill shows as                                           | Best at                                       | Risk                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------- |
| [A. Ledger](../design/profile-directions/a-ledger.html)   | One list of sections with a state and a "on the public resume" column; resumes list below        | A checklist in the docked side panel                        | Empty, changed and unpublished at a glance    | Editing a section is one click further away          |
| [B. Sheet](../design/profile-directions/b-sheet.html)     | The resume itself as the page, edited in place; section outline and resumes in the left column   | Tracked changes on the sheet, Accept and Reject in margin   | Seeing exactly what the resume will look like | Empty and hidden fields are easier to miss           |
| [C. Compare](../design/profile-directions/c-compare.html) | Resumes on the left; saved profile and picked resume side by side, a Use button between each row | The comparison table itself, Differences or All fields tabs | Autofill and keeping several resumes in step  | Plain editing with no resume picked needs a 2nd view |

A came first in the roll; B and C were dealt from the same ranked list (Impeccable concept seed, Operate mode,
`seed:46d3aceb2fe7e0c7`).

## Which one survives the app-wide look

- **A and C** use only the shared roles (page, card, border, muted text, status chips), so they carry over to Course
  catalog, its dark theme or any other app-wide palette unchanged. A is the safest: it is built from the parts Loots
  already has (rows, badges, `DockedPanel`).
- **B** fits Course catalog best, since the page becomes a printed sheet. Under a dark look the sheet stays light, like
  a document preview.
- The Dark Console look (PR #145, the alternative to #143) is not drawn yet. It gets drawn for the chosen direction
  once one is picked. A and C use only shared roles, so they should take it without layout changes.

## Screenshots

In `docs/design/profile-directions/shots/`:

- `a-ledger-desktop.png`, `a-ledger-mobile.png`, `a-ledger-catalog-desktop.png`, `a-ledger-catalog-dark-desktop.png`,
  `a-ledger-1180-sheet.png` (side panel as a sheet below 1280px)
- `b-sheet-desktop.png`, `b-sheet-mobile.png`, `b-sheet-catalog-desktop.png`
- `c-compare-desktop.png`, `c-compare-mobile.png`, `c-compare-catalog-desktop.png`

Desktop at 1440 x 900, phone at 390 wide. These are PNGs because the owner asked for screenshots; the README's
canvas-only rule is for outside agents and is left as is.

## Content

Real: the owner's name, headline, city, email and GitHub from the local profile, the Loots project line, and the
Engineering roadmap counts. Examples, to replace: the three file names and dates, every value in the Autofill diff, the
Portfolio version and date, and `[domain]`. Experience rows use bracketed field names because no real rows are saved.
The phone number is shown only as "Hidden".

## Proposals

- `--diff-add` and `--diff-remove` (each with a soft fill) for the Autofill diff, always beside a word (Now, Resume,
  Saved) and a strike or + mark. Light and dark values are in `proto.css`.
- Muted text on the muted fill measures 4.40:1 on main (the header search field shows it). The prototypes darken
  `--muted-foreground` slightly to pass 4.5:1; the real fix belongs in the Loots section of `globals.css`.
- No label above the page title. Course catalog already drops it; all three directions follow.

## Open questions

None.

## Decided

- **A. Ledger** (24 Oct 2026). Each section row opens its form in the side panel; the row states are Unsaved, Empty,
  Hidden (Local fields, never on the public resume), Not published, Changed (a Publish would change it) and Published.
- **Page width** (25 Oct 2026). Module pages sit in a centered column capped at 1024px (max-w-5xl; Project Memory
  keeps its 1320px), wider than the old 768px Profile column.
- **Differences from the frame** (25 Oct 2026). Changed carries no date: nothing records when one section changed, only
  when the whole Profile was saved. There is no separate Phone row: the phone is part of Contact and never published.
  Each resume row shows Not used and Download and Delete until Autofill exists. The section column keeps Resume and
  Drive file until those pages are dropped.
- **After the Impeccable critique** (25 Oct 2026). Changed is a neutral badge, since blue marks only the picked row
  (DESIGN.md). One Save still covers every section: the panel says how many sections are unsaved, Discard asks first,
  and leaving with edits warns. The open section is in `?section=`, so a refresh keeps it and Back closes it.
- **Delete allowed.** A stored resume can be deleted (resume uploads, PR #147).
- **No Drive.** Resumes come only from Upload; choosing a file in Google Drive is dropped, and Drive is no longer a
  source for Profile (24 Oct 2026). None of the three directions shows a Drive option. The Drive card stays on Profile
  until the Drive removal PR.
