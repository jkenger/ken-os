# Jobs: mockup brief

Status: first mockups drawn 28 Oct 2026, not yet reviewed by the owner. Spec: [job-finder.md](../product/job-finder.md).

Mockups: Figma file [KEOS Jobs](https://www.figma.com/design/pnBihWjurFSwlxNDu22XvC), owned by the Ken account (team
ANXS). Light theme only so far.

| Frame                  | What it shows                                                            |
| ---------------------- | ------------------------------------------------------------------------ |
| Desktop / Setup        | Empty New with the 5-step setup checklist                                |
| Desktop / New          | 12 postings: score, role, pay, type, country, shift columns              |
| Desktop / Posting open | The list with the picked row and the docked panel for one posting        |
| Desktop / Dismissed    | Postings the owner rejected, with their reason and Undo                  |
| Desktop / Filtered out | Hidden postings with their reason and Show anyway                        |
| Desktop / Settings     | Roles, filters, shifts and emails                                        |
| Email / Strong match   | The instant email for one posting                                        |
| Email / Daily digest   | New postings grouped by score, plus the filtered-out count               |
| Phone / New, Posting   | The list as cards, and one posting as a full screen with a sticky footer |

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

1. **Setup:** no alerts received yet. The setup checklist: Copy address, Add Gmail filter, Set up alerts (LinkedIn,
   Indeed, OnlineJobs), each with a state (Done, Not started).
2. **New list:** about 12 postings with a mix of scores, sources, pay Not listed, Partial, and every shift label (Day,
   Mid, Night, Flexible, Not listed).
3. **One posting open:** the side panel with score, why it fits, what's missing, the quoted posting lines, the shift
   with its hours in Philippine time, and Open posting, Save, Mark applied, Dismiss.
4. **Dismissed:** rows showing the reason the owner gave ("Not interested", "Wrong seniority", "Already applied
   elsewhere", "Other: ...") and Undo. Needs an empty state too ("Nothing dismissed yet", one line, no action).
5. **Filtered out:** rows showing the reason ("Below minimum pay", "On site", "Skip word: Sales") and Show anyway.
6. **Settings:** the preferences from the spec, Roles from the Profile, Alert keywords with Copy, the forwarding address.
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
