# Jobs redesign canvas

Source of the Jobs redesign design canvas, drawn from [job-finder.md](../job-finder.md) (frames 1 to 5). Live canvas:
https://claude.ai/artifact/XZmpkM7gPHduY1rp4HCEQ7

- `canvas.json` lists every frame (`boards`), its position and title, in `order`.
- Each `*.dc.html` file is one frame. The markup and inline styles are the design; the `<script type="text/x-dc">`
  block holds sample data. They need the canvas runtime (`support.js`) to render, so read them as source rather than
  opening them in a browser.
- Tokens are the Loots console values from `apps/web/DESIGN.md`, light theme.

| Frame                           | File                                    |
| ------------------------------- | --------------------------------------- |
| Desktop / New (cards)           | `Main.dc.html`                          |
| New heading / Three directions  | `Heading-options.dc.html` (C was built) |
| Desktop / Job detail            | `Detail.dc.html`                        |
| Desktop / Onboarding            | `Onboarding.dc.html`                    |
| Filter sidebar / Empty, Applied | `Filters-empty.dc.html`, `Filters-applied.dc.html` |
| Company logo states             | `Logo-states.dc.html`                   |
| Job detail / Company tab, empty | `Company-empty.dc.html`                 |
| Phone / New, Job detail, Onboarding, Filters sheet | `Phone-new.dc.html`, `Phone-detail.dc.html`, `Phone-onboarding.dc.html`, `Phone-filters.dc.html` |
| Desktop / Overview, no postings | `Overview.dc.html`                      |
| Desktop / New with the status strip | `Status-strip.dc.html`              |
| Phone / Overview                | `Phone-overview.dc.html`                |
| Last checked states             | `Last-checked.dc.html`                  |

Job Board (5 Nov 2026), the "Job Board" section of `job-finder.md`: every frame in that row imports
`JB.dc.html` with a `variant` prop, and every card in it is `JBCard.dc.html`.

| Frame                               | File                                                  |
| ----------------------------------- | ----------------------------------------------------- |
| Card / New, Saved, Applied          | `JB-cards.dc.html`                                    |
| Desktop / Apply confirmation        | `JB-dialog.dc.html`                                   |
| Desktop / Job Board, and empty      | `JB-board.dc.html`, `JB-empty.dc.html`                |
| Phone / Job Board, Apply confirmation | `JB-phone-board.dc.html`, `JB-phone-dialog.dc.html` |

The desktop frames drawn on 1 Nov (New, Job detail, Onboarding) still show the old Jobs section column, which was
removed on 2 Nov 2026. The Overview frames show the current shell.
