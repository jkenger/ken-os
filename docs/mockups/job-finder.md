# Jobs: mockup brief

Status: redesign brief added 1 Nov 2026, not yet drawn. The 28 Oct 2026 frames below (row-based New list, Sheet
panel, checklist-style Settings) are superseded by "Redesign" below, kept only for history. Spec:
[job-finder.md](../product/job-finder.md).

Mockups: Figma file [KEOS Jobs](https://www.figma.com/design/pnBihWjurFSwlxNDu22XvC), owned by the Ken account (team
ANXS). Light theme only so far.

## Redesign (1 Nov 2026): cards, a filter sidebar, a full detail page

From the owner, verbatim: a more informational, detailed `/jobs`. Two columns (filter sidebar, job list) instead of
rows; each job is a card, not a row; the Settings tab becomes the filter sidebar itself; first run becomes an
onboarding flow instead of the current one-form "Match preferences"; opening a job becomes its own detail page, not
a side Sheet.

### Frames to draw

Desktop at 1440 wide, phone at 390.

1. **New list (card layout).** Left: filter sidebar. Right: job cards, one per posting. Each card: company (logo or
   initials, see "Open question" below), job title, a metadata line (work setup, country with a flag), the
   posting's own snippet text truncated to a word limit with an ellipsis when it runs over, skill badges below that,
   a score badge, a Save action. Clicking anywhere on the card opens the detail page (frame 3), not a panel.
2. **Onboarding (first run, no preferences saved yet).** Replaces "Match preferences". One form, not a wizard:
   **Import from Profile** fills Specialization (role) from the owner's headline and last two titles, shown as
   removable chips the owner can add more of; below it, the rest of `job_preferences` (minimum/maximum pay with
   currency and period, job type, work setup, seniority, skip words, skip companies, agencies, posted within) with
   their current defaults. One button, Start matching.
3. **Job detail (full page, not a Sheet).** Two columns.
   - **Left: profile match panel.** Score as a percentage, skills matching (the posting's skills against the
     Profile's), then the job's own metadata repeated for scanning without scrolling back to the card: work format,
     seniority, and two rows -- Location and Country -- that can each hold many countries (a posting open to all of
     Latin America plus the Philippines, for example). Both rows show a stacked group of flag avatars (shadcn's
     `Avatar`, overlapping, a "+N" circle when the list runs past what fits); clicking the group expands a row of
     flag + name badges below it, one per country.
   - **Right: main content.** Header row: company (logo or initials) and name on one side, posted/updated dates on
     the other. Below it, the title, with **Apply** and **Tailor my CV** on the other side. Below that, two tabs:
     **Description** (the posting's full text, formatted) and **Company** (what we know about the company, with an
     empty state when we know nothing). **Save to board** sits opposite the header, not in the tab area.
4. **Filter sidebar, empty vs. applied.** The same fields as onboarding's second half, always visible on `/jobs`
   (no separate Settings tab to navigate to), with a visible count of how many filters are active.

### What's real and what needs building

Checked against the live schema and a live freehire sample before drafting this, so the frames above don't draw
something the pipeline can't produce:

| Card/detail element       | Status                                                                                                                                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Country + flag            | Real for the Country row: `job_postings.countries` already holds ISO codes. The Location row is freeform text (`location`), not a list -- see "Decided" for how it gets the same treatment.                                 |
| Work setup                | Real. `job_postings.workSetup`.                                                                                                                                                                                             |
| Score                     | Real. `job_matches.score`.                                                                                                                                                                                                  |
| Snippet (card summary)    | Real, but it's `snippet` (freehire's own short text), not `summary` -- `summary` is only ever filled in for a Partial posting today, so most cards would show nothing if the card used that field instead.                  |
| Skill badges              | freehire returns a `skills` array per posting (confirmed live), but nothing saves it yet -- `raw-posting.ts` and `job_postings` both need a new column before any card can show a real skill badge.                         |
| Skills matching (detail)  | Not real yet. Scoring today only produces free-text why-it-fits/what's-missing, not a structured skill-by-skill match. Needs its own scoring change, not just a UI change.                                                  |
| Company logo              | Not real yet. Neither freehire nor our schema has a logo URL -- decided below to look one up by domain, which needs a domain (derived from the posting's own link or company name) and a loading/miss design.               |
| Posted/updated dates      | Not real. freehire returns `posted_at`/`updated_at`; we only keep `firstSeenAt` (when we saw it, not when the source posted it). Needs a new column to show the detail page's date line honestly.                           |
| Description formatting    | freehire's `description` is HTML, not markdown. "Allows markdown formatting" either means converting that HTML to markdown at save time, or rendering the HTML directly (sanitized) and dropping "markdown" from the ask.   |
| Company tab content       | Not real. Neither source gives company details (about, size, website) -- the empty state the owner asked for will be what every card shows at first, not an edge case.                                                      |
| Roles as an owner setting | Not real yet. Roles are derived fresh from the Profile on every poll (`roles.ts`), never stored or edited. The onboarding frame's "add multiple role" needs a new `job_preferences.roles` column to hold the owner's edits. |

None of this blocks drawing the frames -- the card and detail mockups can show the intended fields with realistic
example values. It does mean "Frame 1 and 3 ship as drawn" is not true until the rows above marked "Not real" get
their own small slices in `planning`.

### Rules

- Built from the parts Loots already has: `Badge`, `Button`, `Tabs`, `Input`. A left filter sidebar is new (nothing
  in the app currently docks a persistent sidebar inside a page, only the app's own global nav), so note it as a
  proposal when drawing rather than assuming an existing pattern covers it.
- Country flags: propose Unicode regional-indicator emoji (🇵🇭) over a new icon-font dependency -- no install, no
  licensing, and it already carries the ISO code 1:1.
- `Avatar`/`AvatarFallback` is a new primitive (not in `components/ui` yet) -- add it through the shadcn CLI like
  every other primitive here, not hand-rolled, so the shadcn-only UI guard stays green. The stacked-group look is
  shadcn's own documented composition (`flex -space-x-2`, a ring per avatar), not a separate "AvatarGroup"
  component.
- Score stays a number, never colour alone (same rule as the 28 Oct frames).
- App language: "Apply" and "Tailor my CV" are new button names -- note the existing spec
  ([cv-tailoring.md](../product/cv-tailoring.md)) currently says "Tailor resume"; this brief's wording wins since
  it's the most recent owner decision, but `cv-tailoring.md`'s Decisions table needs updating to match during
  `planning`, not left to drift.

### Decided

- **Snippet over summary** (1 Nov 2026): the card's truncated text comes from `snippet`, not `summary`, since
  `summary` is null for every non-Partial posting today.
- **Flag icon = emoji** (1 Nov 2026): no new icon dependency for country flags.
- **Company logo: third-party lookup by domain** (1 Nov 2026, owner's choice): neither freehire nor our schema has
  a logo, so the card and detail page look one up by company domain (e.g. Clearbit's logo API). Still needs, in
  `planning`: how a domain gets derived (the posting's own link, most likely, with the company name as a fallback
  guess), and what the card shows while the lookup is pending or after a miss -- draw both states, don't assume a
  logo always loads.
- **Location and Country: grouped flag avatars, click to expand** (1 Nov 2026, owner's choice): a posting open to
  many countries (Latin America plus the Philippines, say) shows a stacked, overlapping group of flag avatars
  instead of a long string; clicking it expands a row of flag + name badges beneath. Recommended default for which
  field feeds it, pending the owner's confirmation at review: both the Location and Country rows read from the one
  structured list, `job_postings.countries`, since that's the only field that's actually a discrete list today --
  `location` is freeform text and splitting it on its own punctuation to make avatars would be guesswork. Location
  keeps one difference: it leads with the work-setup word ("Remote, " then the avatar group); Country is the
  avatar group alone.

| Frame                       | What it shows                                                                    |
| --------------------------- | -------------------------------------------------------------------------------- |
| Desktop / Match preferences | Empty New with the match-preferences form: Roles, Minimum pay, Countries, Shifts |
| Desktop / New               | 12 postings: score, role, pay, type, country, shift columns                      |
| Desktop / Posting open      | The list with the picked row and the docked panel for one posting                |
| Desktop / Dismissed         | Postings the owner rejected, with their reason and Undo                          |
| Desktop / Filtered out      | Hidden postings with their reason and Show anyway                                |
| Desktop / Settings          | Roles, filters, shifts and emails                                                |
| Email / Strong match        | The instant email for one posting                                                |
| Email / Daily digest        | New postings grouped by score, plus the filtered-out count                       |
| Phone / New, Posting        | The list as cards, and one posting as a full screen with a sticky footer         |

The file holds local components (buttons, badges, Job row, Job list head, Filtered row, Job card (phone)) and a
`Loots` colour collection taken from `apps/web/DESIGN.md`.

### Differences from this brief

- Phone frames are drawn only for New and Posting; the other screens use the same parts stacked.
- New, Saved, Applied, Dismissed, Filtered out and Settings live in the section column, not as tabs on the page.
- The badge reads "Outside shifts" so it fits beside the shift name; the spec uses the same words.
- Dismiss sits in the panel header beside Close, so the footer keeps Open posting, Save and Mark applied. Clicking
  Dismiss asks for a reason first (Not interested, Wrong seniority, Already applied elsewhere, Other) before the
  posting moves to Dismissed.
- Dismissed reasons show in muted grey, not red: a rejection the owner chose is not the same as a rule that hid a
  posting, which keeps the red in Filtered out.
- Score is the one number in mono; pay and hours use Geist, following the Mono For Figures rule.

## Frames to draw

Desktop at 1440 x 900 and phone at 390 wide for each.

1. **Match preferences:** no postings yet. A short form, not a checklist: Roles (prefilled from the Profile, editable),
   Minimum pay (with currency and period), Countries and Shifts, with one button, Start matching. The rest of the
   Preferences table (job type, work setup, seniority, skip words, skip companies, agencies, posted within, instant
   email, digest time) keeps its defaults until the owner changes them in Settings.
2. **New list:** about 12 postings with a mix of scores, sources, pay Not listed, Partial, and every shift label (Day,
   Mid, Night, Flexible, Not listed).
3. **One posting open:** the side panel with score, why it fits, what's missing, the quoted posting lines, the shift
   with its hours in Philippine time, and Open posting, Save, Mark applied, Dismiss.
4. **Dismissed:** rows showing the reason the owner gave ("Not interested", "Wrong seniority", "Already applied
   elsewhere", "Other: ...") and Undo. Needs an empty state too ("Nothing dismissed yet", one line, no action).
5. **Filtered out:** rows showing the reason ("Below minimum pay", "On site", "Skip word: Sales") and Show anyway.
6. **Settings:** the preferences from the spec, Roles from the Profile, and each scraped source's state (Running,
   Blocked until a time): LinkedIn, Indeed, and OnlineJobs if its checker is built.
7. **Strong match email** and **daily digest email**, as they look in Gmail.

## Rules

- Built from the parts Loots already has: rows, Badge, `DockedPanel`, the module column (max-w-5xl). Shared roles only,
  no new colours unless proposed below.
- Score and shift carry a word or number, never colour alone.
- App language: title "Jobs", tabs New, Saved, Applied, Dismissed, Filtered out; buttons Save, Mark applied, Dismiss,
  Undo, Show anyway, Copy address. No tagline, no sentence about what the page does. Read
  `docs/product/app-language.md` first.

## Content

Examples only, to replace: every company, title, pay and score. Roles come from the owner's real Profile headline and
last two titles.

## Open questions

None.

## Decided

- **Score** (28 Oct 2026): a number (92) in the row and the panel, no Strong, Good or Weak band.
- **Shift** (28 Oct 2026): its own column, with the label and the hours in Philippine time ("Mid shift, 5 PM to
  1 AM").
- **Dismissed** (30 Oct 2026, from an `/impeccable critique` finding): the data model already had a Dismissed state
  with no tab to see it from, breaking "nothing disappears silently" for the one state the feature invents. Added as
  its own section between Applied and Filtered out, kept separate from Filtered out because one is the owner's own
  choice and the other is a rule firing; each needs a different fix if it feels wrong. Dismiss now asks for a reason
  before it moves the posting, matching the spec's existing "Dismiss with a reason" and feeding the later
  suggested-filter-changes step.
- **Match preferences replaces the Setup checklist** (31 Oct 2026): the brief's Setup frame still showed the Gmail-forward
  checklist (Copy address, Add Gmail filter, Set up alerts), which the spec dropped on 31 Oct 2026 when direct scraping
  replaced the alert-email path (see "Getting postings in" in [job-finder.md](../product/job-finder.md)). Scraping
  needs nothing from the owner beyond a Profile headline, so there is no setup left to check off. What the owner still
  has to give is a few numbers no scraper can guess: how much the job should pay, which countries, and which shift. The
  new first-run frame asks for exactly those (Roles, Minimum pay, Countries, Shifts) in one form, then starts matching.
